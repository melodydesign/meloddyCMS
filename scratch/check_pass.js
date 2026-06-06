const bcrypt = require('bcryptjs');
const hash = '$2b$10$3HPE./TXFXqoBix9EqfEqesb1lklZZ5uZIKMKkS63o1rwMJ93V9Te';

const candidates = ['admin', 'password', '123456', 'admin123', 'meloddy', 'test123', 'qwerty', 'dev1', 'client1', 'admin1', '111111', 'pass123', 'melody'];

(async () => {
    for (const pw of candidates) {
        const match = await bcrypt.compare(pw, hash);
        if (match) {
            console.log(`MATCH FOUND: "${pw}"`);
            return;
        }
    }
    console.log('No match found in common passwords');
})();
