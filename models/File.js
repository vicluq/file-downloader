const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    path: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    password: String, // Not required (shorthand is just the type)
    downloadCount: {
        type: Number,
        required: true,
        default: 0
    }
})

module.exports = mongoose.model('files', schema); // Creating the collecion 'files'