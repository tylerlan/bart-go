const express = require('express');
const { asyncMiddleware } = require('../middleware');
const axios = require('axios');
const moment = require('moment');
const boom = require('boom');
const router = express.Router();

/* ==================================================================== */

const { savedCommutes, stationAbrvMap } = require('../utils');
const { morning, evening } = savedCommutes;

/* ==================================================================== */

function queryBuilder(command, origin, destination, date, tripsBefore, tripsAfter, includeLegend) {
    return `sched.aspx?cmd=${command}&orig=${origin}&dest=${destination}&key=${
        process.env.API_KEY
    }&date=${date}&b=${tripsBefore}&a=${tripsAfter}&l=${includeLegend}&json=y`;
}

/* ==================================================================== */

function getSomeData(origin, destination) {
    let command = 'depart'; // the schedule for your trip based on the time you want to 'depart' or 'arrive'
    let date = 'now'; // mm/dd/yyyy or 'today' or 'now'
    let numTripsBeforeTime = 0; // can be between 0 and 4
    let numTripsAfterTime = 3; // can be between 0 and 4
    let includeLegend = 0; // 1 for yes, and 0 for no

    const query = queryBuilder(
        command,
        origin,
        destination,
        date,
        numTripsBeforeTime,
        numTripsAfterTime,
        includeLegend
    );

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

function produceResults(startingPoint) {
    const { date, time, request } = startingPoint;

    const trips = request.trip.map(tripOption => {
        let departureTime = tripOption['@origTimeMin'];
        let arrivalTime = tripOption['@destTimeMin'];

        let duration = moment
            .utc(moment(arrivalTime, 'HH:mm:ss').diff(moment(departureTime, 'HH:mm:ss')))
            .format('mm');

        let whenToLeave = moment.utc(moment(departureTime, 'HH:mm:ss').diff(moment())).format('mm');

        let legs = tripOption.leg.map(leg => {
            return `${leg['@trainHeadStation']} train from ${leg['@origin']} to ${
                leg['@destination']
            } (${leg['@origTimeMin']} to ${leg['@destTimeMin']})`;
        });

        // it typically takes 5-7 minutes to bike to Lake Merritt station,
        // and around 10-12 minutes to bike to 12th st
        //
        // the fastest I've gotten from the office to Downtown Berkely Station is 3 minutes
        let tripInfo = {
            'If you leave NOW, you have': `${whenToLeave} minutes`,
            departure: departureTime,
            arrival: arrivalTime,
            duration: `${duration} minues`,
            cost: `$${tripOption.fares.fare[0]['@amount']}`,
            legs
        };

        return tripInfo;
    });

    return trips;
}

/* ==================================================================== */

router.get(
    '/workToLake',
    asyncMiddleware(async (req, res, next) => {
        let og = evening[0].origin;
        let dest = evening[0].destination;

        const rawData = await getSomeData(stationAbrvMap[og], stationAbrvMap[dest]);
        const text = `Options for getting from ${og} to ${dest}`;

        const trips = produceResults(rawData.root.schedule);

        res.json({ [text]: trips });
    })
);

/* ==================================================================== */

router.get(
    '/homeToWork',
    asyncMiddleware(async (req, res, next) => {
        let og = 'Lake Merritt';
        let og2 = '12th St. Oakland City Center';
        let dest = 'Downtown Berkeley';

        const rawData = await getSomeData(stationAbrvMap[og], stationAbrvMap[dest]);
        const rawData2 = await getSomeData(stationAbrvMap[og2], stationAbrvMap[dest]);

        const text = `Options for getting from ${og} to ${dest}`;
        const text2 = `Options for getting from ${og2} to ${dest}`;

        const trips = produceResults(rawData.root.schedule);
        const trips2 = produceResults(rawData2.root.schedule);

        res.json({ [text]: trips, [text2]: trips2 });
    })
);

router.get(
    '/workToHome',
    asyncMiddleware(async (req, res, next) => {
        let og = 'Downtown Berkeley';
        let dest = 'Lake Merritt';

        const rawData = await getSomeData(stationAbrvMap[og], stationAbrvMap[dest]);

        const text = `Options for getting from ${og} to ${dest}`;

        const trips = produceResults(rawData.root.schedule);

        res.json({ [text]: trips });
    })
);

// for visiting my parents, or game night at dan's house
router.get(
    '/homeToCivic',
    asyncMiddleware(async (req, res, next) => {
        let og = 'Lake Merritt';
        let og2 = '12th St. Oakland City Center';
        let dest = 'Civic Center (SF)';

        const rawData = await getSomeData(stationAbrvMap[og], stationAbrvMap[dest]);
        const rawData2 = await getSomeData(stationAbrvMap[og2], stationAbrvMap[dest]);

        const text = `Options for getting from ${og} to ${dest}`;
        const text2 = `Options for getting from ${og2} to ${dest}`;

        const trips = produceResults(rawData.root.schedule);
        const trips2 = produceResults(rawData2.root.schedule);

        res.json({ [text]: trips, [text2]: trips2 });
    })
);

// for visiting Galvanize or other appointments in SOMA or downtown
router.get(
    '/homeToMontgomery',
    asyncMiddleware(async (req, res, next) => {
        let og = 'Lake Merritt';
        let og2 = '12th St. Oakland City Center';
        let dest = 'Montgomery St. (SF)';

        const rawData = await getSomeData(stationAbrvMap[og], stationAbrvMap[dest]);
        const rawData2 = await getSomeData(stationAbrvMap[og2], stationAbrvMap[dest]);

        const text = `Options for getting from ${og} to ${dest}`;
        const text2 = `Options for getting from ${og2} to ${dest}`;

        const trips = produceResults(rawData.root.schedule);
        const trips2 = produceResults(rawData2.root.schedule);

        res.json({ [text]: trips, [text2]: trips2 });
    })
);

// for game night at allens's house
router.get(
    '/workToGlen',
    asyncMiddleware(async (req, res, next) => {
        let og = 'Downtown Berkeley';
        let dest = 'Glen Park (SF)';

        const rawData = await getSomeData(stationAbrvMap[og], stationAbrvMap[dest]);

        const text = `Options for getting from ${og} to ${dest}`;

        const trips = produceResults(rawData.root.schedule);

        res.json({ [text]: trips });
    })
);

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

module.exports = router;
