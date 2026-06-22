const path = require('path');

const commonOutputPath = path.resolve(__dirname, 'dist');

const createConfig = (entryFile, outputFilename, name) => ({
    mode: 'production',
    entry: `./js/${entryFile}`,
    output: {
        filename: outputFilename,
        path: commonOutputPath,
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    name,
});

module.exports = [
    createConfig('_entry.js', 'app.js', 'app'),
];
