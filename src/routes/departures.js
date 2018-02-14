const express = require('express');
const { asyncMiddleware } = require('../middleware');
const axios = require('axios');
const boom = require('boom');
const router = express.Router();

/* ==================================================================== */

function queryBuilder(cmd, sta, dir) {
    return `etd.aspx?cmd=${cmd}&orig=${sta}&key=${process.env.API_KEY}&dir=${dir}&json=y`;
}

/* ==================================================================== */

function getSomeData(command, station, direction) {
    const query = queryBuilder(command, station, direction);

    return axios
        .get(`${process.env.BASE_URL}/${query}`)
        .then(response => {
            return response.data;
        })
        .catch(err => {
            console.log('Error fetching data:');
            console.log('-------------------------------------------------');
            console.log(err);
            return err;
        });
}

/* ==================================================================== */

function returnTrainsAndDepartures(station) {
    const trainsDepartingFromStation = {};

    station[0].etd.forEach(train => {
        trainsDepartingFromStation[train.destination] = {};
        trainsDepartingFromStation[train.destination].color = train.estimate[0].hexcolor;
        trainsDepartingFromStation[train.destination].departures = train.estimate.map(
            t => t.minutes
        );
    });

    return trainsDepartingFromStation;
}

function deliverResults(data) {
    const { date, time, message, station } = data;

    const text = `Trains departing from ${station[0].name} (relative to ${time})`;
    const trains = returnTrainsAndDepartures(station);

    return { [text]: trains };
}

/* ==================================================================== */

// e.g. http://localhost:8005/departures/etd?origin=dbrk&direction=s
router.get(
    '/etd',
    asyncMiddleware(async (req, res, next) => {
        let { origin, direction } = req.query;
        // origins: '12th', 'dbrk', 'mlbr', etc.
        // directions: 'n' or 's'

        const rawData = await getSomeData('etd', origin, direction);

        const results = deliverResults(rawData.root);
        res.json(results);
    })
);

/* ==================================================================== */

router.get(
    '/macSouth',
    asyncMiddleware(async (req, res, next) => {
        const rawData = await getSomeData('etd', 'mcar', 's');

        const results = deliverResults(rawData.root);
        res.json(results);
    })
);

router.get(
    '/berkSouth',
    asyncMiddleware(async (req, res, next) => {
        const rawData = await getSomeData('etd', 'dbrk', 's');

        const results = deliverResults(rawData.root);
        res.json(results);
    })
);

/* ==================================================================== */

router.get(
    '/lakeNorth',
    asyncMiddleware(async (req, res, next) => {
        const rawData = await getSomeData('etd', 'lake', 'n');

        const results = deliverResults(rawData.root);
        res.json(results);
    })
);

router.get(
    '/12thNorth',
    asyncMiddleware(async (req, res, next) => {
        const rawData = await getSomeData('etd', '12th', 'n');

        const results = deliverResults(rawData.root);
        res.json(results);
    })
);

module.exports = router;
