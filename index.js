'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const departures = require('./src/routes/departures');
const router = require('./src/routes/index');
require('dotenv').config();

const PORT = process.env.PORT || 8000;
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(cors());

app.use(router);
app.use('/departures', departures);

app.get('/', (req, res) => {
    res.status(200).send('Bart GO!!!');
});

/* ========================
  CATCH-ALL ERROR HANDLER
=========================== */

app.use((err, req, res, next) => {
    console.error('Something broke!', err);
    return res.sendStatus(err.httpStatusCode).json(err);
});

/* ========================
        LISTENER
=========================== */

app.listen(PORT, () => {
    console.log('#############################');
    console.log(`Listening on ${PORT}`); // eslint-disable-line no-console
    console.log('#############################');
});

module.exports = app;
