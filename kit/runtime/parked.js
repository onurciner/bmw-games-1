'use strict';
/**
 * parked.js - "parked only" for games and anything else that mustn't run while driving.
 *
 *   const parked = require('./kit/parked').watch(ctx, log);
 *   parked.moving()   // true while the car drives (above MAX_KMH) and "allowInMotion" is off
 *   parked.allowed()  // true while the app may play in motion ("allowInMotion")
 *   parked.speed()    // km/h last read, or null (no speed: a VM / bench)
 *
 * Needs "de.bmw.infotainment.vehicle.Vehicle2": { "statusCarSpeed2": "rs" } in app.json "signals".
 * Every game has a setting "allowInMotion" (bool, ALLOW_IN_MOTION by default) and checks it with
 * moving(): on, the car counts as parked and the game plays in motion; off, it pauses above MAX_KMH.
 * An app.json without the setting takes ALLOW_IN_MOTION.
 *
 * Speed from Vehicle2.statusCarSpeed2, also re-read every 2 s: a car standing still may not
 * notify a speed that doesn't change. When the signal goes quiet, the last speed it read counts:
 * quiet after standing = parked (counting quiet as moving blocked a parked car in Doom 1.4.0),
 * quiet after driving = moving (the safe side) until a speed is read again. Without any real speed
 * (a VM or a bench: none, or "invalid" 65535) the car counts as parked.
 */
const MAX_KMH = 3;
const ALLOW_IN_MOTION = true;      // the "allowInMotion" setting's default

/** Whether the car may be played in motion: the "allowInMotion" setting, else ALLOW_IN_MOTION. */
function inMotionAllowed(ctx) {
    const v = ctx && ctx.settings && ctx.settings.get('allowInMotion');
    return v === undefined || v === null ? ALLOW_IN_MOTION : !!v;
}

function watch(ctx, log) {
    let speed = null;
    ctx.signals.watch('de.bmw.infotainment.vehicle.Vehicle2', '1', {
        statusCarSpeed2: (v) => {
            const k = v && v.speedVehicleCentreOfGravity;
            if (typeof k === 'number' && k !== 65535) speed = k * 0.015625;
        },
    }, log, { pollMs: 2000 }).then((s) => log && log.info('parked check: speed ' + (s.error ? 'error: ' + s.error : 'subscribed')));
    return {
        moving: () => speed !== null && speed > MAX_KMH && !inMotionAllowed(ctx),
        allowed: () => inMotionAllowed(ctx),
        speed: () => speed,
    };
}

module.exports = { watch, MAX_KMH, ALLOW_IN_MOTION };
