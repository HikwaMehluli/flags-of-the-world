const path = require('path');
const webpack = require('webpack');

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
    plugins: [
        new webpack.DefinePlugin({
            'process.env.GA_MEASUREMENT_ID': JSON.stringify(process.env.GA_MEASUREMENT_ID || '')
        }),
    ],
    name,
});

module.exports = [
    createConfig('_entry.js', 'app.js', 'app'),
];
