const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
    const projectFile = req.query.project_file;
    res.render('entry_editor', { projectFile });
});

app.listen(PORT, () => {
    console.log(`Entry server is running on port ${PORT}`);
});