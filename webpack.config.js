module.exports = {
    mode: "development",
    watch: true,
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.(png|jpe?g|gif)$/i,
                use: [
                    {
                        loader: 'file-loader',
                    },
                ],
            },
            {
                test: /\.obj$/i,
                use: 'raw-loader',
            }
        ]
    }
};
