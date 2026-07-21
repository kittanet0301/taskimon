# คู่มือการเล่น Taskino

Taskino เป็นเกมเลี้ยงสัตว์เสมือนที่นำกิจกรรมการใช้คอมพิวเตอร์มาเปลี่ยนเป็นคะแนนสำหรับการเติบโตของสัตว์ ผู้เล่นเริ่มจากไข่ ดูแลสัตว์ ทำภารกิจ สะสมไอเทมและ Gems พัฒนาสกิล ต่อสู้ และผสมพันธุ์เพื่อขยาย Collection

## เส้นทางการเล่นโดยย่อ

1. สมัครหรือเข้าสู่ระบบและรับไข่เริ่มต้น
2. คลิกเมาส์และพิมพ์เพื่อสะสม Activity และ Evolution
3. ฟักไข่เมื่อ Evolution ถึง 100
4. ดูแล Health และ Emotion พร้อมทำ Daily/Weekly Missions
5. เลือก Growth Card และอัปสกิลเมื่อ Level เพิ่ม
6. สะสม Gems เพื่อซื้อไข่ ช่อง Collection และไอเทม
7. พัฒนาเป็น Adult เพื่อเข้าร่วม Battle และ Breeding

## Activity Score

สูตรคะแนนกิจกรรมคือ:

```text
Activity Score = จำนวนคลิก + floor(จำนวนปุ่มที่กด / 10)
```

- คลิกเมาส์ 1 ครั้ง = 1 Activity Score
- กดคีย์บอร์ด 10 ครั้ง = 1 Activity Score
- ตัวอย่าง: คลิก 25 ครั้งและพิมพ์ 87 ครั้ง จะได้ 25 + 8 = 33 คะแนน

Desktop จะพยายามนับกิจกรรมทั่วเครื่องหลังเข้าสู่ระบบ หาก Global Tracking ใช้งานไม่ได้จะนับเฉพาะในแอป ส่วน Web จะนับเฉพาะภายในหน้าเว็บ Activity ประจำวันจะรีเซ็ตพร้อม Daily Missions ตอนเที่ยงคืนตามเวลาท้องถิ่น

## Evolution และการเติบโต

ผู้เล่นทั่วไปได้รับ Evolution จากกิจกรรมดังนี้:

- ทุก 100 คลิก = +1 Evolution
- ทุก 500 ปุ่มที่กด = +1 Evolution
- ได้จากกิจกรรมสูงสุด 10 Evolution ต่อชั่วโมง
- Development Vitamin = +50 Evolution
- Daily Mission เล่นครบ 1 ชั่วโมง = +5 Evolution

เงื่อนไขการเติบโต:

- Egg → Baby: Evolution อย่างน้อย 100
- Baby → Adult: Evolution อย่างน้อย 500 และผ่านไปอย่างน้อย 48 ชั่วโมงหลังฟัก

บัญชี Admin อาจเปิดโหมดทดสอบที่ลดข้อจำกัดเหล่านี้

## Level, Growth Cards และสกิล

- Baby เริ่ม Level 2 และเพิ่ม 1 Level ทุก 80 Evolution
- Adult เริ่ม Level 5 และเพิ่ม 1 Level ทุก 40 Evolution

ทุกครั้งที่ Level เพิ่มจะได้รับ:

- Growth Card ให้เลือก 1 ใบจาก 3 ใบ
- Skill Upgrade Point 1 แต้ม

Growth Card เพิ่ม STR, DEX, INT, CON หรือเพิ่มหลายค่าพร้อมกัน เมื่อไข่ฟัก สัตว์จะสุ่ม Loadout เป็นสกิลปกติ 3 สกิลและ Ultimate 1 สกิล สกิลปกติใช้ MP ส่วน Ultimate ใช้ TP 100

Skill Upgrade Point ใช้เพิ่ม Rank ของสกิลได้สูงสุด Rank 8 ส่วน Skill Forget ใช้สุ่มเปลี่ยนสกิลหนึ่งช่อง โดยสกิลใหม่จะเริ่มที่ Rank 1

## ค่าดูแลสัตว์

สัตว์มีค่าสถานะดูแล 3 ค่า:

- Health: สุขภาพ
- Emotion: อารมณ์
- Evolution: ความก้าวหน้าในการเติบโต

เมื่อไม่ได้เข้าเกม Emotion จะลดประมาณ 2 ต่อชั่วโมง และ Health ลดประมาณ 0.5 ต่อชั่วโมง เมื่อ Health ต่ำกว่า 30 สัตว์จะอยู่ในสถานะป่วย Health และ Emotion สูงสุด 100 ส่วน Evolution สูงสุด 999

### ผลของไอเทม

| ไอเทม | ผล |
| --- | --- |
| Basic Food | Emotion +15 |
| Premium Food | Emotion +30, Health +10 |
| Water | Emotion +10, Health +5 |
| Medicine | Health +40 |
| Toy | Emotion +25 |
| Development Vitamin | Evolution +50 |
| Battle Shield | ลดความเสียหายในการต่อสู้ |
| Breed Nest | ใช้ผสมพันธุ์หนึ่งครั้ง |
| Skill Forget | สุ่มเปลี่ยนสกิลหนึ่งช่อง |

ผู้เล่นใหม่เริ่มด้วย Basic Food ×2, Water ×2 และ Medicine ×1 และสามารถกำหนด Quick Item Slots ได้สูงสุด 6 ช่อง

## Daily Missions

| ภารกิจ | รางวัลหลัก |
| --- | --- |
| พิมพ์ 500 ครั้ง | Basic Food ×1 |
| คลิก 200 ครั้ง | Toy ×1 |
| ให้อาหาร 3 ครั้ง | Emotion +10 |
| เล่นครบ 1 ชั่วโมง | Evolution +5 |

เมื่อกดรับ Daily Mission จะได้รับเพิ่ม 5 Gems ต่อภารกิจ Daily Missions รีเซ็ตตอนเที่ยงคืน

## Weekly Missions

| ภารกิจ | รางวัลหลัก |
| --- | --- |
| ได้ Evolution จากกิจกรรม 100 แต้ม | Breed Nest ×1 |
| รับ Daily Mission อย่างน้อยหนึ่งภารกิจใน 5 วัน | Skill Forget ×1 |
| ฟักไข่ 1 ฟอง | ไข่ใหม่ |
| ทำ Daily Mission ใน 5 วัน | ช่อง Collection +5 |
| สะสม Evolution ตามเป้าหมาย 50 | ไข่ใหม่ |
| ชนะ Battle 3 ครั้ง | Battle Shield ×1 |

เมื่อกดรับ Weekly Mission จะได้รับเพิ่ม 15 Gems ต่อภารกิจ

## Gems และ Market

Gems ได้จากการกดรับ Mission:

- Daily Mission = 5 Gems
- Weekly Mission = 15 Gems
- Admin สามารถแจก Gems ในกรณีพิเศษ

Minigame และ Battle ยังไม่ให้ Gems โดยตรง

### ราคาสินค้า

| สินค้า | ราคา |
| --- | ---: |
| ไข่สุ่ม | 25 Gems |
| ช่อง Collection +1 | 12 Gems |
| ช่อง Collection +5 | 50 Gems |
| Basic Food | 2 Gems |
| Water | 2 Gems |
| Medicine | 3 Gems |
| Toy | 3 Gems |
| Premium Food | 5 Gems |
| Battle Shield | 8 Gems |
| Skill Forget | 12 Gems |
| Breed Nest | 15 Gems |
| Care Bundle | 8 Gems |

Care Bundle ประกอบด้วย Basic Food ×3, Water ×2 และ Medicine ×1

## Collection

- เริ่มต้นมี 5 ช่อง
- เพิ่มได้สูงสุด 36 ช่อง
- แสดงหน้าละ 12 ช่อง
- ไข่ Active Pet และสัตว์ที่เก็บไว้ล้วนใช้ช่อง Collection
- สามารถเปลี่ยน Active Pet เปลี่ยนชื่อ หรือปล่อยสัตว์ได้

ควรเหลือช่องว่างก่อนซื้อไข่ รับไข่จาก Mission หรือผสมพันธุ์

## ธาตุและค่าสถานะต่อสู้

ค่าสถานะหลักประกอบด้วย:

- STR: พลังโจมตีกายภาพ
- DEX: ความเร็วและโอกาสหลบ
- INT: MP และพลังสกิล
- CON: HP และพลังป้องกัน

ค่าต่อสู้ที่คำนวณได้:

```text
Max HP = 40 + CON × 5
Max MP = INT × 10
ATK = STR
DEF = CON
```

ธาตุที่รองรับ ได้แก่ Fire, Grass, Ground, Electric, Water, Ice, Dragon, Dark และ Neutral ระบบปัจจุบันกำหนดสัตว์เกิดใหม่เป็นธาตุเดี่ยว ซึ่งสร้างความเสียหายเพิ่ม 25% การโจมตีธาตุที่แพ้ทางคูณ 1.5 และธาตุที่ต้านทานคูณ 0.75

## Battle

Battle เป็น PvP แบบผลัดเทิร์นผ่านห้องต่อสู้ การกระทำหลักได้แก่ Attack, Skill, Item, Defend และ Flee

- ลำดับเทิร์นสัมพันธ์กับ DEX
- Attack ใช้ STR เป็นหลัก
- Skill ใช้ค่าสถานะและธาตุของสกิล
- Defend ลดความเสียหายประมาณ 50%
- Attack, Skill และ Defend ช่วยสะสม TP
- Ultimate ต้องใช้ TP 100
- ต้องมี Health และ Emotion อย่างน้อย 30 จึงเข้าต่อสู้ได้
- ชนะแล้ว Emotion +5 และเพิ่มความคืบหน้า Weekly Battle Mission
- หนีแล้ว Emotion -3

ห้องรองรับสมาชิกได้สูงสุด 8 คน แต่การต่อสู้จริงเป็น 1v1

## Breeding

เงื่อนไขการผสมพันธุ์:

- พ่อแม่ต้องเป็น Adult ทั้งคู่
- ต้องเป็นคนละเพศและเป็นสัตว์คนละตัว
- ต้องมี Breed Nest ×1
- ต้องมีช่อง Collection ว่าง
- พ่อแม่ต้องพ้น Cooldown 6 ชั่วโมง

ลูกจะอยู่ในรูปไข่ Species มีโอกาส 50/50 สืบทอดจากพ่อหรือแม่ ส่วนธาตุและค่าสถานะต่อสู้จะถูกสร้างใหม่

## Minigames

ปัจจุบันมี Dino Jump และ Rock Dodge

- ทำคะแนนอย่างน้อย 1,000 เพื่อรับไอเทม
- สุ่ม Basic Food, Water, Medicine หรือ Toy จำนวน 1 ชิ้น
- รับได้สูงสุด 3 ชิ้นต่อวันต่อมินิเกม
- Best Score จะถูกบันทึกไว้
- เล่นต่อได้หลังรับรางวัลครบเพื่อทำคะแนนอันดับ

## Friends, Gifts และ Chat

หลังเข้าสู่ระบบ ผู้เล่นสามารถค้นหาและเพิ่มเพื่อนด้วย Friend Code รับหรือปฏิเสธคำขอ ส่งไอเทมจาก Inventory รับของขวัญ สนทนา และเข้าร่วม Chat Lobby ได้ ไอเทมที่ส่งจะถูกหักจาก Inventory ของผู้ส่งตามจำนวนจริง

## Desktop และ Web

### Desktop

- มีตัวละครลอยอยู่เหนือหน้าต่างอื่น
- ลากตัวละครเพื่อย้ายตำแหน่งได้
- ดับเบิลคลิกเพื่อใช้ Toy
- คลิกขวาเพื่อเปิด Hub
- กด Esc เพื่อจบการลาก
- มี System Tray
- พยายามนับกิจกรรมทั่วเครื่องหลัง Login

### Web

- ไม่มี Desktop Pet Overlay และ System Tray
- นับกิจกรรมเฉพาะภายในหน้าเว็บ
- ใช้ UI และกฎเกมหลักร่วมกับ Desktop

## การบันทึกข้อมูล

หลัง Login ข้อมูลจะ Sync กับ Cloud ได้แก่สัตว์ Collection, Inventory, Missions, Activity, Gems, Quick Slots, Minigame scores และข้อมูลออนไลน์ Desktop มีไฟล์บันทึกในเครื่อง ส่วน Web ใช้ localStorage เป็น fallback

ก่อน Login ตัวละคร Desktop อาจแสดงเป็นไข่ชั่วคราว และจะโหลดข้อมูลจริงจาก Cloud หลังเข้าสู่ระบบ

## คำแนะนำสำหรับผู้เล่นใหม่

1. ทำ Daily Missions และกดรับรางวัลทุกวันเพื่อสะสม Gems
2. รักษา Health และ Emotion ไว้เหนือ 30 เพื่อให้พร้อม Battle
3. เล่น Minigames เพื่อเก็บไอเทมฟรีก่อนซื้อจาก Market
4. เหลือช่อง Collection อย่างน้อยหนึ่งช่องก่อนรับไข่หรือผสมพันธุ์
5. เลือก Growth Card ให้สอดคล้องกับบทบาทของสัตว์และสกิลที่มี
6. เก็บ Breed Nest และ Skill Forget ไว้ใช้เมื่อจำเป็น
7. อัป Rank ของสกิลที่ใช้งานบ่อยก่อนกระจายแต้มไปทุกสกิล
