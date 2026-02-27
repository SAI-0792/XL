const JimpModule = require('jimp');
console.log('JimpModule.Jimp exists:', !!JimpModule.Jimp);
if (JimpModule.Jimp) {
    console.log('Keys of JimpModule.Jimp:', Object.keys(JimpModule.Jimp));
    console.log('JimpModule.Jimp.read exists:', !!JimpModule.Jimp.read);
}

// Check other keys
console.log('JimpModule.JimpMime exists:', !!JimpModule.JimpMime);
if (JimpModule.JimpMime) {
    console.log('Keys of JimpModule.JimpMime:', Object.keys(JimpModule.JimpMime));
}
