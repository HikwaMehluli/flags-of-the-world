
// TODO: Bundle JS files.

const path = require('path');
const Dotenv = require('dotenv-webpack');

const commonOutputPath = path.resolve(__dirname, 'dist');

const createConfig = (entryFile, outputFilename, name) => ({
    mode: 'production',
    entry: `./js/${entryFile}`,
    output: {
        filename: outputFilename,
        path: commonOutputPath,
    },
    plugins: [
        new Dotenv({
            path: './.env', // Path to .env file
            safe: true, // Load .env.example as fallback
            allowEmptyValues: true, // Allow empty values
            defaults: './.env.defaults', // Load default values
        })
    ],
    name,
});

module.exports = [
    createConfig('_entry.js', 'app.js', 'app'),
];