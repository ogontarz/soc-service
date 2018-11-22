module.exports = {
    "extends": "airbnb-base",
    "rules": {
        "no-console": 0,
        "linebreak-style": [0, "error", "windows"],
        'max-len': ["error", { "code": 140 }],
        "no-use-before-define": ["error", { "functions": false, "classes": true }]
    }
};