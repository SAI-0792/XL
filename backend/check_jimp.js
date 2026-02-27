const Jimp = require('jimp');
console.log('Keys:', Object.keys(Jimp));
console.log('Type of Jimp:', typeof Jimp);
console.log('Jimp.read exists:', !!Jimp.read);
console.log('Jimp.default exists:', !!Jimp.default);
if (Jimp.default) {
    console.log('Keys of default:', Object.keys(Jimp.default));
    console.log('Type of default:', typeof Jimp.default);
    console.log('Jimp.default.read exists:', !!Jimp.default.read);
}
