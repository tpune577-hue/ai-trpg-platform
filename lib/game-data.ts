export const SCENES = [
    { id: 's1', name: 'Misty Forest', url: 'https://img.freepik.com/premium-photo/majestic-misty-redwood-forest-with-lush-green-ferns-sunlight-filtering-through-fog_996993-7424.jpg' },
    { id: 's2', name: 'Cave', url: 'https://img.freepik.com/premium-photo/mystical-cave-with-glowing-path_1150025-23150.jpg' },
    { id: 's3', name: 'City', url: 'https://img.freepik.com/premium-photo/medieval-town-scene-with-knights-horseback_14117-943575.jpg' },
    { id: 's4', name: 'Dungeon', url: 'https://media.istockphoto.com/id/1308121289/th/%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B8%96%E0%B9%88%E0%B8%B2%E0%B8%A2/%E0%B8%84%E0%B8%B2%E0%B8%95%E0%B8%B2%E0%B8%84%E0%B8%AD%E0%B8%A1%E0%B8%9A%E0%B9%8C%E0%B8%A2%E0%B8%B8%E0%B8%84%E0%B8%81%E0%B8%A5%E0%B8%B2%E0%B8%87%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%99%E0%B9%88%E0%B8%B2%E0%B8%81%E0%B8%A5%E0%B8%B1%E0%B8%A7%E0%B9%84%E0%B8%A1%E0%B9%88%E0%B8%A1%E0%B8%B5%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%AA%E0%B8%B4%E0%B9%89%E0%B8%99%E0%B8%AA%E0%B8%B8%E0%B8%94%E0%B8%9E%E0%B8%A3%E0%B9%89%E0%B8%AD%E0%B8%A1%E0%B8%84%E0%B8%9A%E0%B9%80%E0%B8%9E%E0%B8%A5%E0%B8%B4%E0%B8%87-%E0%B9%81%E0%B8%99%E0%B8%A7%E0%B8%84%E0%B8%B4%E0%B8%94%E0%B8%9D%E0%B8%B1%E0%B8%99%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%A2%E0%B8%A5%E0%B8%B6%E0%B8%81%E0%B8%A5%E0%B8%B1%E0%B8%9A-%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%80%E0%B8%A3%E0%B8%99%E0%B9%80%E0%B8%94%E0%B8%AD%E0%B8%A3%E0%B9%8C-3.jpg?s=612x612&w=0&k=20&c=4xgjyFF3DVq40ymFvz-tVcLGSk4wsD7Yif5F_n9vom4=' },
    { id: 's5', name: 'วัด1', url: 'https://thumb.ac-illust.com/8e/8e5f0d9980957b8df80ac32dd7457005_t.jpeg' },
    { id: 's6', name: 'วัด2', url: 'https://png.pngtree.com/thumb_back/fh260/background/20230518/pngtree-cave-has-sunlight-coming-out-of-it-image_2533303.jpg' },
    { id: 's7', name: 'แท่นบูชา', url: 'https://i.pinimg.com/736x/e8/a5/60/e8a5608a90bb42cdcd79a3f9eaf853a5.jpg' },
    { id: 's8', name: 'กับดักหิน', url: 'https://www.roomforzoom.com/backgrounds/Indiana-Jones-Boulder-chasing-you-275.jpg' },
]

export const NPCS = [
    { id: 'n1', name: 'Shadow Goblin', type: 'ENEMY', imageUrl: 'https://dmdave.com/wp-content/uploads/2020/02/shadow-goblin.png' },
    { id: 'n2', name: 'Ancient Chest', type: 'NEUTRAL', imageUrl: 'https://www.pngarts.com/files/3/Treasure-Chest-PNG-Download-Image.png' },
    { id: 'n3', name: 'Village Elder', type: 'FRIENDLY', imageUrl: 'https://s3-eu-west-2.amazonaws.com/dungeon20/images/985066/medium-63ed55ce6d3ac22ce30730a0bf172152f56bf9c8.png?1676026777' },
    { id: 'n4', name: 'สร้อยคอ', type: 'NEUTRAL', imageUrl: 'https://png.pngtree.com/png-vector/20250801/ourlarge/pngtree-european-american-cartoon-game-style-ancient-egyptian-necklace-with-large-gem-png-image_16961718.webp' },
    { id: 'n5', name: 'เสาหิน', type: 'NEUTRAL', imageUrl: 'https://png.pngtree.com/png-vector/20250928/ourmid/pngtree-ornate-stone-pillar-with-intricate-carvings-of-divine-figures-reminiscent-ancient-png-image_17622004.webp' },
]

interface GameItem {
    id: string;        // สร้าง random เช่น 'item-' + Date.now()
    name: string;      // GM พิมพ์เอง
    description: string; // GM พิมพ์เอง
    type: 'WEAPON' | 'CONSUMABLE' | 'KEY' | 'MISC'; // GM เลือก
    icon?: string;     // ระบบเลือกให้ หรือ GM ใส่ Emoji เอง
}