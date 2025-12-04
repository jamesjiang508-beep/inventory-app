const express = require('express');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

let db;
const dbPath = 'inventory.db';

// 初始化数据库
async function initDB() {
    console.log('初始化数据库...');
    
    const SQL = await initSqlJs();
    
    // 如果数据库文件存在，加载；否则创建新数据库
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
        console.log('已加载现有数据库');
    } else {
        db = new SQL.Database();
        console.log('已创建新数据库');
    }
    
    // 创建表结构
    db.run(`CREATE TABLE IF NOT EXISTS styles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        sort_order INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sizes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        sort_order INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS stock_init (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        style_name TEXT NOT NULL,
        size_name TEXT NOT NULL,
        quantity INTEGER DEFAULT 0,
        UNIQUE(style_name, size_name)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name TEXT NOT NULL,
        item_type TEXT DEFAULT 'clothing',
        style_name TEXT,
        size_name TEXT,
        other_item_name TEXT,
        quantity INTEGER DEFAULT 1,
        remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS other_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        initial_quantity INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 插入预设数据
    const styles = [['黑', 1], ['灰蓝', 2], ['深蓝', 3], ['白', 4]];
    const sizes = [['XS', 1], ['S', 2], ['M', 3], ['L', 4], ['XL', 5]];

    styles.forEach(([name, order]) => {
        db.run('INSERT OR IGNORE INTO styles (name, sort_order) VALUES (?, ?)', [name, order]);
    });

    sizes.forEach(([name, order]) => {
        db.run('INSERT OR IGNORE INTO sizes (name, sort_order) VALUES (?, ?)', [name, order]);
    });

    saveDatabase();
    console.log('数据库初始化完成！');
}

// 保存数据库到文件
function saveDatabase() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
}

// ========== API 路由 ==========

// API-1: 获取所有款式
app.get('/api/styles', (req, res) => {
    try {
        const result = db.exec('SELECT name, sort_order FROM styles ORDER BY sort_order');
        const styles = result[0] ? result[0].values.map(row => ({ name: row[0], sort_order: row[1] })) : [];
        res.json({ success: true, styles });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API-2: 获取所有尺寸
app.get('/api/sizes', (req, res) => {
    try {
        const result = db.exec('SELECT name, sort_order FROM sizes ORDER BY sort_order');
        const sizes = result[0] ? result[0].values.map(row => ({ name: row[0], sort_order: row[1] })) : [];
        res.json({ success: true, sizes });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API-3: 获取初始库存矩阵
app.get('/api/stock/init', (req, res) => {
    try {
        const stockResult = db.exec('SELECT style_name, size_name, quantity FROM stock_init');
        const stylesResult = db.exec('SELECT name FROM styles ORDER BY sort_order');
        const sizesResult = db.exec('SELECT name FROM sizes ORDER BY sort_order');

        const matrix = {};
        if (stockResult[0]) {
            stockResult[0].values.forEach(row => {
                const [style, size, qty] = row;
                if (!matrix[style]) matrix[style] = {};
                matrix[style][size] = qty;
            });
        }

        res.json({
            success: true,
            matrix,
            styles: stylesResult[0] ? stylesResult[0].values.map(row => row[0]) : [],
            sizes: sizesResult[0] ? sizesResult[0].values.map(row => row[0]) : []
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API-4: 更新初始库存
app.post('/api/stock/init', (req, res) => {
    const { style, size, qty } = req.body;
    
    if (!style || !size || qty === undefined) {
        return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    try {
        db.run(
            `INSERT INTO stock_init (style_name, size_name, quantity) 
             VALUES (?, ?, ?)
             ON CONFLICT(style_name, size_name) 
             DO UPDATE SET quantity = ?`,
            [style, size, qty, qty]
        );
        saveDatabase();
        res.json({ success: true, message: '库存已更新' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API-5: 获取剩余总表数据（核心算法 - 包含衣服和其它物品）
app.get('/api/stock/dashboard', (req, res) => {
    try {
        // 衣服库存
        const initResult = db.exec('SELECT style_name, size_name, quantity FROM stock_init');
        const usedResult = db.exec(`
            SELECT style_name, size_name, SUM(quantity) as total_used 
            FROM usage_logs
            WHERE item_type = 'clothing'
            GROUP BY style_name, size_name
        `);
        const stylesResult = db.exec('SELECT name FROM styles ORDER BY sort_order');
        const sizesResult = db.exec('SELECT name FROM sizes ORDER BY sort_order');

        const usedMap = {};
        if (usedResult[0]) {
            usedResult[0].values.forEach(row => {
                const [style, size, totalUsed] = row;
                usedMap[`${style}_${size}`] = totalUsed;
            });
        }

        const matrix = {};
        if (initResult[0]) {
            initResult[0].values.forEach(row => {
                const [style, size, qty] = row;
                if (!matrix[style]) matrix[style] = {};
                const key = `${style}_${size}`;
                const used = usedMap[key] || 0;
                
                matrix[style][size] = {
                    init: qty,
                    used: used,
                    remain: qty - used
                };
            });
        }

        // 其它物品库存
        const otherItemsResult = db.exec('SELECT id, name, initial_quantity FROM other_items ORDER BY name');
        const otherUsedResult = db.exec(`
            SELECT other_item_name, SUM(quantity) as total_used 
            FROM usage_logs
            WHERE item_type = 'other'
            GROUP BY other_item_name
        `);

        const otherUsedMap = {};
        if (otherUsedResult[0]) {
            otherUsedResult[0].values.forEach(row => {
                otherUsedMap[row[0]] = row[1];
            });
        }

        const otherItems = [];
        if (otherItemsResult[0]) {
            otherItemsResult[0].values.forEach(row => {
                const [id, name, initQty] = row;
                const used = otherUsedMap[name] || 0;
                otherItems.push({
                    id,
                    name,
                    init: initQty,
                    used,
                    remain: initQty - used
                });
            });
        }

        res.json({
            success: true,
            clothing: {
                matrix,
                styles: stylesResult[0] ? stylesResult[0].values.map(row => row[0]) : [],
                sizes: sizesResult[0] ? sizesResult[0].values.map(row => row[0]) : []
            },
            otherItems
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API-6: 获取使用流水列表（包含衣服和其它物品）
app.get('/api/usage/logs', (req, res) => {
    try {
        const result = db.exec(`
            SELECT id, user_name, item_type, style_name, size_name, other_item_name, quantity, remark,
                   datetime(created_at, 'localtime') as created_at
            FROM usage_logs 
            ORDER BY created_at DESC
        `);
        
        const logs = result[0] ? result[0].values.map(row => ({
            id: row[0],
            user_name: row[1],
            item_type: row[2],
            style_name: row[3],
            size_name: row[4],
            other_item_name: row[5],
            quantity: row[6],
            remark: row[7],
            created_at: row[8]
        })) : [];

        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API-7: 添加使用记录（支持衣服和其它物品）
app.post('/api/usage/add', (req, res) => {
    const { user, itemType, style, size, otherItemName, qty, remark } = req.body;
    
    if (!user) {
        return res.status(400).json({ success: false, error: '缺少使用人姓名' });
    }

    if (itemType === 'clothing' && (!style || !size)) {
        return res.status(400).json({ success: false, error: '衣服类型需要款式和尺寸' });
    }

    if (itemType === 'other' && !otherItemName) {
        return res.status(400).json({ success: false, error: '其它物品需要物品名称' });
    }

    const quantity = qty || 1;

    try {
        db.run(
            `INSERT INTO usage_logs (user_name, item_type, style_name, size_name, other_item_name, quantity, remark) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [user, itemType || 'clothing', style || null, size || null, otherItemName || null, quantity, remark || null]
        );
        saveDatabase();
        
        res.json({ 
            success: true, 
            message: '使用记录已添加',
            id: db.exec('SELECT last_insert_rowid()')[0].values[0][0]
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API-8: 获取所有其它物品
app.get('/api/other-items', (req, res) => {
    try {
        const result = db.exec('SELECT id, name, initial_quantity FROM other_items ORDER BY name');
        const items = result[0] ? result[0].values.map(row => ({
            id: row[0],
            name: row[1],
            initial_quantity: row[2]
        })) : [];
        res.json({ success: true, items });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API-9: 添加其它物品
app.post('/api/other-items', (req, res) => {
    const { name, quantity } = req.body;
    
    if (!name) {
        return res.status(400).json({ success: false, error: '缺少物品名称' });
    }

    try {
        db.run(
            'INSERT INTO other_items (name, initial_quantity) VALUES (?, ?)',
            [name, quantity || 0]
        );
        saveDatabase();
        res.json({ success: true, message: '物品已添加' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API-10: 更新其它物品库存
app.put('/api/other-items/:id', (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;
    
    if (quantity === undefined) {
        return res.status(400).json({ success: false, error: '缺少数量参数' });
    }

    try {
        db.run(
            'UPDATE other_items SET initial_quantity = ? WHERE id = ?',
            [quantity, id]
        );
        saveDatabase();
        res.json({ success: true, message: '库存已更新' });
    } catch (error) {
        res.status(500).json({ success: false, error:error.message });
    }
});

// API-11: 删除其它物品
app.delete('/api/other-items/:id', (req, res) => {
    const { id } = req.params;

    try {
        db.run('DELETE FROM other_items WHERE id = ?', [id]);
        saveDatabase();
        res.json({ success: true, message: '物品已删除' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 提供主页
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`
    ========================================
    🚀 衣服库存管理系统已启动！
    ========================================
    访问地址: http://localhost:${PORT}
    数据库文件: inventory.db
    ========================================
        `);
    });
});

// 优雅关闭
process.on('SIGINT', () => {
    if (db) {
        saveDatabase();
        db.close();
    }
    console.log('\n数据库已保存并关闭');
    process.exit(0);
});
