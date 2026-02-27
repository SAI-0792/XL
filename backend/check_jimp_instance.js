const Jimp = require('jimp');
new Jimp(10, 10, (err, image) => {
    if (err) throw err;
    console.log('Instance created');
    console.log('image.getWidth exists:', !!image.getWidth);
    console.log('image.getBufferAsync exists:', !!image.getBufferAsync);
    console.log('image.resize exists:', !!image.resize);
    console.log('image.greyscale exists:', !!image.greyscale);
});
