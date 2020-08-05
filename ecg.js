/**
 * Created by Laurence on 19/11/15.
 */
var ecgCanvas = $("#ecg");
var ecgCtx;
var py = 0;
var px = 0;
var opy = 0;
var opx = 0;
var n = 0;
var Oldn = 0;
var altPy = 0;

var spo2Canvas = $("#spo2Canvas");
var spo2Ctx;
var spo2n = 0;
var spo2Baseline = 200;
var spo2Array = [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 51, 52, 53, 54, 55, 60, 80, 120, 150, 155, 157, 159, 160, 159, 158, 157, 156, 155, 153, 151, 149, 146, 142, 139, 135, 133, 131, 129, 128, 127, 126, 125, 125, 125, 125, 125, 124, 123, 121, 115, 109, 100, 90, 80, 72, 64, 57, 52, 51];
var spo2py = (spo2Array[0] * -1) + spo2Baseline;
var spo2opy = spo2py;
var spo2Oldn = 0;

var etco2Canvas = $("#etco2Canvas");
var etco2Ctx;
var etco2n = 0;
var etco2Baseline = 130;
var etco2Array = [0, 1, 2, 4, 6, 10, 20, 30, 40, 50, 60, 70, 80, 85, 88, 90, 92, 93, 94, 95, 95.5, 96, 96.5, 97, 97.5, 98, 98.5, 99, 99.5, 100, 100.5, 101, 101.5, 102, 102.5, 103, 103.5, 104, 104.5, 105, 105.5, 106, 106.5, 107, 107.5, 108, 108.5, 109, 109.5, 110, 110.5, 111, 111.5, 112, 112.5, 113, 113.5, 114, 113, 111, 109, 103, 95, 80, 40, 5, 3, 2, 1, 0];
var etco2py = (etco2Array[0] * -1) + etco2Baseline;
var etco2opy = etco2py;
var etco2Oldn = 0;

var baseline;
var scanbar;
var ooy;
var peakArray = [0, 0, 0];
var peaks = 0;
var vfDelay = 3;
var vf = 0;
var vfIncrement = 0;
var lastY = 0;
var s = 2000;
var af = 0;

var monitorOn = false;
var ecgRunning = false;
var spo2Running = false;
var etco2Running = false;

var ecgReading = false;
var ecgSet = false;
var ecgTimeout;

var spo2Reading = false;
var spo2Set = false;
var spo2Timeout;

var etco2Reading = false;
var etco2Set = false;
var etco2Timeout;

var ecgRequestId;

var rArray = ["asystole", "vf", "vt", "pea", "nsr", "stemi", "af", "aflutter", "svt"];
var rhythm = "asystole";
var postShockRhythym = "vf";
var roscRhythym = "stemi";
var rhythmChangeAfterCpr = "vt";

//Default Obs
var sats = 100;
var bpm = 70;
var brpm = 16;
var vpm = 15;
var ventilating = false;
var intubated = false;
var cpr = false;
var cycleState = "noCycle";
var preCprVpm;
var vCo2 = 35;
var bCo2 = 55;
var co2;

var compressionsCounter = 0;
var ventilationsCounter = 0;

var beatInterval = 1000 / (bpm / 60);
var respInterval = 1000 / (brpm / 60);
var hr;
var rr;

var heartbeat = false;
var breath = false;
var animate = false;
var spo2Animate = false;
var etco2Animate = false;

var energy = 200;
var defibCharging = false;
var defibCharged = false;
var shocking = false;
var chargeFlash;
var chargeShockFlash;
var chargeTween;
var shockCounter = 0;
var rhythmChangeOnShock = 1;
var roscOnShock = 2;
var rosc = false;
var rhythmChangeAfterCprSeconds = 15;
var cprTimeout;

var maxSysBP = 130;
var minSysBP = 100;
var maxDiaBP = 80;
var minDiaBP = 60;
var sysBP;
var diaBP;
var bprunning = false;
var bpInterval;

var chargedSFX = new Audio("tones/charged.mp3");
var chargingSFX = new Audio("tones/charging.mp3");
var tickSFX = new Audio("tones/tick.mp3");
var onSFX = new Audio("tones/on.mp3");
var switchSFX = new Audio("tones/switch.mp3");
var ticking = false;
var tickInterval;
var mobileChargedTimeout;

var queryRead = false;
var clockTimer;

function pulse() {
    console.log("pulse");
    if (rhythm != "vt" && rhythm != "vf" && rhythm != "asystole") {
        heartbeat = true;
        console.log("lub-dub")
    }
}

function breathing() {
    if ((rhythm != "vt" && rhythm != "vf" && rhythm != "asystole") || ventilating == true) {
        var breathingRate = brpm;
        if (ventilating == true) {
            breathingRate = vpm;
        }
        if (breathingRate > 0) {
            breath = true;
            console.log("woosh");
        }
    }
}

function clock() {
    var currentHour = new Date().getHours();
    currentHour = ("0" + currentHour).slice(-2);
    var currentMins = new Date().getMinutes();
    currentMins = ("0" + currentMins).slice(-2);
    var currentSecs = new Date().getSeconds();
    currentSecs = ("0" + currentSecs).slice(-2);
    $("#clock").text(currentHour + ":" + currentMins + ":" + currentSecs);
}

$(document).ready(function () {
    getQuery();
    $(window).resize(function () {
        onResize()
    });
    updateRR();
    updateHR();
    initaliseCanvas();
    mapKeys();
    updateSettings();
});

function getQuery() {
    var vars = [], hash;
    var q = document.URL.split('?')[1];
    if (q != undefined) {
        q = q.split('&');
        for (var i = 0; i < q.length; i++) {
            hash = q[i].split('=');
            vars.push(hash[1]);
            vars[hash[0]] = hash[1];
        }
    }
    //Settings
    //a=rhythm
    if (vars['a'] > -1 && vars['a'] < rArray.length) {
        $("#presentingRhythmBox").val(rArray[vars['a']])
    }
    // b=postShockRhythm
    if (vars['b'] > -1 && vars['b'] < rArray.length) {
        $("#postShockRhythmBox").val(rArray[vars['b']])
    }
    // c=rhythmChangeAfterCpr
    if (vars['c'] > -1 && vars['c'] < rArray.length) {
        $("#postCPRRhythmBox").val(rArray[vars['c']])
    }
    // d=ROSC rhythm
    if (vars['d'] > -1 && vars['d'] < rArray.length) {
        $("#roscRhythmBox").val(rArray[vars['d']])
    }
    //e = changeOnShock
    if (vars['e'] > -1) {
        $("#postRhythmShockNum").val(vars['e'])
    }
    //f = roscOnShock
    if (vars['f'] > -1) {
        $("#roscRhythmShockNum").val(vars['f'])
    }
    //g = cprRhythmChangeAfter
    if (vars['g'] > -1) {
        $("#postCprTimeBox").val(vars['g'])
    }
    updateSettings();

    //Variables
    //h=bpm
    if (vars['h'] > -1) {
        $("#heartRateBox").val(vars['h'])
    }
    //i=brpm
    if (vars['i'] > -1) {
        $("#breathingRateBox").val(vars['i'])
    }
    //j=sats
    if (vars['j'] > -1) {
        $("#satsBox").val(vars['j'])
    }
    //k=vCo2
    if (vars['k'] > -1) {
        $("#co2Box").val(vars['k'])
    }
    //l=maxSysBP
    if (vars['l'] > -1) {
        $("#maxSysBox").val(vars['l'])
    }
    //n=maxDiaBox
    if (vars['m'] > -1) {
        $("#maxDiaBox").val(vars['m'])
    }
    //n=minSysBox
    if (vars['n'] > -1) {
        $("#minSysBox").val(vars['n'])
    }
    //p=minDiaBox
    if (vars['o'] > -1) {
        $("#minDiaBox").val(vars['o'])
    }
    updateVars();
    //p=bCo2
    if (vars['p'] > -1) {
        $("#bCo2Box").val(vars['p'])
    }

    //Ventilations
    if (vars['q'] > -1) {
        $("#vpmBox").val(vars['q'])
    }
    updateActions();

    queryRead = true;
}

function makeQuery() {
    if (queryRead) {
        var names = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q"];
        var vars = [];
        vars[0] = rArray.indexOf(rhythm);
        vars[1] = rArray.indexOf(postShockRhythym);
        vars[2] = rArray.indexOf(rhythmChangeAfterCpr);
        vars[3] = rArray.indexOf(roscRhythym);
        vars[4] = rhythmChangeOnShock;
        vars[5] = roscOnShock;
        vars[6] = rhythmChangeAfterCprSeconds;
        vars[7] = bpm;
        vars[8] = brpm;
        vars[9] = sats;
        vars[10] = vCo2;
        vars[11] = maxSysBP;
        vars[12] = maxDiaBP;
        vars[13] = minSysBP;
        vars[14] = minDiaBP;
        vars[15] = bCo2;
        vars[16] = vpm;

        var qString = "#?";

        for (var q = 0; q < names.length; q++) {
            qString += names[q];
            qString += "=";
            qString += vars[q];
            if (q == names.length - 1) {
                window.location.hash = qString;
            } else {
                qString += "&";
            }
        }
    }
}

function initaliseCanvas() {
    ecgCanvas = document.getElementById("ecg");
    ecgCtx = ecgCanvas.getContext('2d'),
        w = ecgCanvas.clientWidth,
        h = ecgCanvas.clientHeight,
        px = 0, opx = 0, speed = 2,
        py = h * 0.5, opy = py,
        scanBarWidth = 20;
    ecgCtx.canvas.width = w;
    ecgCtx.canvas.height = h;
    ecgCtx.strokeStyle = '#00FF00';
    ecgCtx.lineWidth = 2;
    ecgCtx.imageSmoothingEnabled = true;

    spo2Canvas = document.getElementById("spo2Canvas");
    spo2Ctx = spo2Canvas.getContext('2d');
    spo2Ctx.canvas.width = w;
    spo2Ctx.canvas.height = h;
    spo2Ctx.strokeStyle = '#4d79ff';
    spo2Ctx.lineWidth = 2;
    spo2Ctx.imageSmoothingEnabled = true;

    etco2Canvas = document.getElementById("etco2Canvas");
    etco2Ctx = etco2Canvas.getContext('2d');
    etco2Ctx.canvas.width = w;
    etco2Ctx.canvas.height = h;
    etco2Ctx.strokeStyle = '#FFA500';
    etco2Ctx.lineWidth = 2;
    etco2Ctx.imageSmoothingEnabled = true;

    baseline = h * 0.5;


}

function monitorTurnOnOff() {
    if (ecgRunning == false && !ecgRequestId) {
        drawECG();
        monitorOn = true;
        onSFX.play();
        $("#monitorButton").text("On").css({"background-color": "#ffffff", "color": "#000000"});
        clock();
        clockTimer = setInterval(clock, 1000)
    } else {
        window.cancelAnimationFrame(ecgRequestId);
        ecgRequestId = undefined;
        ecgCtx.clearRect(0, 0, ecgCanvas.width, ecgCanvas.height);
        px = 0, opx = 0, py = h * 0.5, opy = py;
        n = 0;
        clearTimeout(ecgTimeout);
        ecgReading = false;
        ecgSet = false;
        $("#heartRate").text("--");
        ecgRunning = false;
        if (spo2Running == true) {
            spo2On();
        }
        if (etco2Running == true) {
            etco2On();
        }
        energy = 200;
        $("#energyValue").text("---");
        if (defibCharging == true) {
            chargeTween.kill();
        }
        if (defibCharged == true) {
            chargeFlash.kill();
            chargeShockFlash.kill();
        }
        defibCharged = false;
        defibCharging = false;
        shocking = false;
        shockCounter = 0;
        $("#chargeButtonLabel").text("Charge").css({"backgroundColor": "", "color": ""});
        $("#chargeButtonLabel").css({"backgroundColor": "", "color": ""});
        $("#shockButtonLabel").css({"backgroundColor": "", "color": ""});
        $("#chargeBar").css({"width": "0%"});
        $("#chargeButton").onclick = charge;
        $("#monitorButton").text("Off");
        $("#monitorButton").css({"background-color": "", "color": ""});
        if (ticking) {
            metronomeOn()
        }
        if (clockTimer) {
            clearInterval(clockTimer)
        }
        $("#clock").text("");
        $("#shockDisplay").text("");
        cancelBP();
        monitorOn = false;
    }
}

function spo2On() {
    if (monitorOn) {
        switchSFX.play();
    }
    if (ecgRunning == true && spo2Running == false) {
        spo2Running = true;
        $("#spo2buttonLabel").css({"background-color": "#ffffff", "color": "#000000"});
        $("#spo2buttonLabel > span.longText").text(" on");
    } else {
        spo2Ctx.clearRect(0, 0, spo2Canvas.width, spo2Canvas.height);
        clearTimeout(spo2Timeout);
        spo2Reading = false;
        spo2Set = false;
        $("#spo2").text("--");
        $("#spo2buttonLabel").css({"background-color": "", "color": ""});
        $("#spo2buttonLabel > span.longText").text(" off");
        spo2Running = false
    }
}

function etco2On() {
    if (monitorOn) {
        switchSFX.play();
    }
    if (ecgRunning == true && etco2Running == false) {
        etco2Running = true;
        $("#etco2buttonLabel").css({"background-color": "#ffffff", "color": "#000000"});
        $("#etco2buttonLabel > span.longText").text(" on");
    } else {
        etco2Ctx.clearRect(0, 0, etco2Canvas.width, etco2Canvas.height);
        clearTimeout(etco2Timeout);
        etco2Reading = false;
        etco2Set = false;
        $("#etco2").text("--");
        $("#rr").text("--");
        $("#etco2buttonLabel").css({"background-color": "", "color": ""});
        $("#etco2buttonLabel span.longText").text(" off");
        etco2Running = false
    }
}

function drawECG() {
    af++;
    if (heartbeat == true) {
        if (n > 0) {
            n = 0;
        }
        if (spo2n > 0) {
            //spo2ndiffArray[spo2ndiffArray.length] = spo2n;
            spo2Oldn = spo2n;
            spo2n = 0;
        }
        animate = true;
        spo2Animate = true;
        heartbeat = false;
    }
    if (breath == true) {
        if (etco2n > 0) {
            //spo2ndiffArray[spo2ndiffArray.length] = spo2n;
            etco2Oldn = etco2n;
            etco2n = 0;
        }
        etco2Animate = true;
        breath = false;
    }
    /// move forward at defined speed
    px += speed;
    ///Calculate py
    if (shocking == true) {
        ecgReading = false;
        ecgSet = false;
        py = null;
    } else if (cpr == true && cycleState != "onlyVentilations") {
        if (cprTimeout == undefined && rosc == false) {
            cprTimeout = setTimeout(function () {
                rhythm = rhythmChangeAfterCpr;
                ecgSet = false;
            }, rhythmChangeAfterCprSeconds * 1000);
            console.log(cprTimeout, "Set")
        }
        n++;
        py = generateRhythm("cpr")
    } else if (rhythm == "vf") {
        ecgReading = false;
        ecgSet = false;
        py = calculateVF(30, -30)
    } else if (rhythm == "vt") {
        ecgReading = true;
        n++;
        py = generateRhythm(rhythm)
    } else if (animate == true) {
        ecgReading = true;
        n++;
        py = generateRhythm(rhythm);
        //if(altPy!=null){
        //  py = ( (altPy*-1) + (py * -1))*-1
        //}
    } else if (rhythm == "af") {
        py = calculateVF(-8, 8)
    } else if (rhythm == "aflutter") {
        py = calculateFlutter();
    } else {
        py = 0;
    }
    py += baseline;
    if (ecgReading == true) {
        if (ecgSet == false) {
            ecgSet = true;
            if (rhythm == "vt") {
                bpm = 190;
            }
            console.log("setting...");
            ecgTimeout = setTimeout(function () {
                $("#heartRate").text(bpm)
            }, 3000);
        }
    } else {
        $("#heartRate").text("--");
    }

    //// clear ahead (scan bar)
    scanbar = ecgCtx.clearRect(px, 0, scanBarWidth, h);

    /// draw line from old plot point to new
    ecgCtx.beginPath();
    ecgCtx.moveTo(opx, opy);
    ecgCtx.lineTo(px, py);
    ecgCtx.stroke();
    if (py != peakArray[0] && py < (h * 0.4)) {
        peakArray[2] = peakArray[1];
        peakArray[1] = peakArray[0];
        peakArray[0] = py;
        if (peakArray[1] < peakArray[0] && peakArray[1] < peakArray[2]) {
            peaks++
        }
    }

    if (spo2Running == true) {
        drawSpo2();
    }
    if (etco2Running == true) {
        drawetco2();
    }
    /// update old plot point
    opx = px;
    ooy = opy;
    opy = py;
    lastY = py - baseline;

    /// check if edge is reached and reset position
    if (opx > w) {
        px = opx = -speed;
    }
    ecgRequestId = requestAnimationFrame(drawECG);
    ecgRunning = true;
}

function drawSpo2() {
    ///Calculatespo2opy
    if (rhythm == "vf" || rhythm == "pea" || shocking == true) {
        spo2Reading = false;
        spo2Set = false;
        spo2py = (spo2Array[0] * -1);
        $("#spo2").text("--");
    } else if (spo2Animate == true) {
        spo2Reading = true;
        spo2n++;
        spo2py = spo2Array[spo2n] * -1;
        /*if(spo2ndiffArray.length > 0){
         console.log("Superimposing...");
         for (spo2Object = 0;spo2Object<spo2ndiffArray.length;spo2Object++){
         console.log("Adding array "+spo2Object);
         var oldN = spo2ndiffArray[spo2Object];
         console.log(oldN);
         spo2py += (spo2Array[oldN] * -1);
         console.log("Updating OldN from " + oldN + " to " + (oldN=oldN+1));
         spo2ndiffArray[spo2Object] = oldN+1;
         if(spo2ndiffArray[spo2Object] >= spo2Array.length-1)
         {
         spo2ndiffArray.splice(spo2Object,1);
         console.log("Cut")
         }
         }
         }*/
        if (spo2Oldn > 0) {
            var oldspy = spo2Array[spo2Oldn] * -1;
            if (oldspy < spo2py) {
                spo2py = oldspy;
            }
            spo2Oldn++;
            if (spo2Oldn >= spo2Array.length - 1) {
                spo2Oldn = 0;
            }
        }
        spo2py = ((((spo2py * -1) - spo2Array[0]) * (sats / 100)) + spo2Array[0]) * -1;
    } else {
        spo2py = spo2Array[0] * -1;
    }
    if (spo2Reading == true) {
        if (spo2Set == false) {
            spo2Set = true;
            spo2Timeout = setTimeout(function () {
                $("#spo2").text(sats)
            }, 3000);
        }
    } else {
        $("#spo2").text("--");
    }

    spo2py += spo2Baseline;
    //// clear ahead (scan bar)
    spo2Ctx.clearRect(px, 0, scanBarWidth, h);

    /// draw line from old plot point to new
    spo2Ctx.beginPath();
    spo2Ctx.moveTo(opx, spo2opy);
    spo2Ctx.lineTo(px, spo2py);
    spo2Ctx.stroke();
    /// update old plot point
    spo2opy = spo2py;

    if (spo2n >= spo2Array.length - 1) {
        spo2n = 0;
        spo2Animate = false
    }

}

function drawetco2() {
    ///Calculateetco2opy
    if ((rhythm == "vf" && ventilating == false) ||
        (rhythm == "vt" && ventilating == false) ||
        (rhythm == "pea" && ventilating == false) ||
        (rhythm == "asystole" && ventilating == false) ||
        shocking == true ||
        cycleState == "onlyCompressions") {
        etco2Reading = false;
        etco2Set = false;
        etco2py = (etco2Array[0] * -1);
        $("#etco2").text("--");
        $("#rr").text("--");
    } else if (etco2Animate == true) {
        etco2Reading = true;
        etco2n++;
        etco2py = etco2Array[etco2n] * -1;
        /*if(etco2ndiffArray.length > 0){
         console.log("Superimposing...");
         for (etco2Object = 0;etco2Object<etco2ndiffArray.length;etco2Object++){
         console.log("Adding array "+etco2Object);
         var oldN = etco2ndiffArray[etco2Object];
         console.log(oldN);
         etco2py += (etco2Array[oldN] * -1);
         console.log("Updating OldN from " + oldN + " to " + (oldN=oldN+1));
         etco2ndiffArray[etco2Object] = oldN+1;
         if(etco2ndiffArray[etco2Object] >= etco2Array.length-1)
         {
         etco2ndiffArray.splice(etco2Object,1);
         console.log("Cut")
         }
         }
         }*/
        if (etco2Oldn > 0) {
            var oldCo2Py = etco2Array[etco2Oldn] * -1;
            if (oldCo2Py < etco2py) {
                etco2py = oldCo2Py;
            }
            etco2Oldn++;
            if (etco2Oldn >= etco2Array.length - 1) {
                etco2Oldn = 0;
            }
            1
        }
        if (ventilating) {
            co2 = vCo2
        } else {
            co2 = bCo2
        }
        var co2Perc = co2 / 60;
        if (co2Perc > 1) {
            co2Perc = 1;
        }
        etco2py = ((((etco2py * -1) - etco2Array[0]) * (co2Perc)) + etco2Array[0]) * -1;
    } else {
        etco2py = etco2Array[0] * -1;
    }
    if (etco2Reading == true) {
        if (etco2Set == false) {
            etco2Set = true;
            etco2Timeout = setTimeout(function () {
                $("#etco2").text(co2);
                if (ventilating == true) {
                    $("#rr").text(vpm)
                } else {
                    $("#rr").text(brpm)
                }
            }, 3000);
        }
    } else {
        $("#etco2").text("--");
        $("#rr").text("--")

    }
    etco2py += etco2Baseline;
    //// clear ahead (scan bar)
    etco2Ctx.clearRect(px, 0, scanBarWidth, h);

    /// draw line from old plot point to new
    etco2Ctx.beginPath();
    etco2Ctx.moveTo(opx, etco2opy);
    etco2Ctx.lineTo(px, etco2py);
    etco2Ctx.stroke();
    /// update old plot point
    etco2opy = etco2py;
    if (etco2n >= etco2Array.length - 1) {
        etco2n = 0;
        etco2Animate = false;
        if (cycleState == "onlyVentilations") {
            ventilationsCounter++;
            if (ventilationsCounter >= 2) {
                ventilationsCounter = 0;
                cycleState = "onlyCompressions";
                vpm = preCprVpm;
                updateRR();
            }
        }
    }
}

function calculateVF(max, min) {
    vf++;
    var newY = 0;
    if (vf >= vfDelay) {
        vf = 0;
        newY = Math.floor(Math.random() * (max - min + 1)) + min;
        if (vfDelay <= 1) {
            return newY;
        } else {
            vfIncrement = newY / vfDelay;
            return vfIncrement;
        }
    } else {
        return lastY + vfIncrement;
    }
}

function calculateFlutter() {
    var flutterArray = [0, 3, 5, 7, 9, 7, 5, 3];
    if (af >= flutterArray.length - 1) {
        af = 0;
    }
    return flutterArray[af] * -1;
}

function generateRhythm(wave) {
    var waveArray;
    var vtArray = [-50, -20, 20, 35, 38, 40, 42, 44, 45, 46, 47, 48, 49, 50, 49, 48, 47, 43, 39, -50];
    var aArray = [0, 0, 0, 0, 0];
    var nsrArray = [0, 3, 5, 6, 7, 8, 7, 6, 5, 3, 0, 0, 0, -2.5, -5, 35, 60, 34, -7, 0, 0, 0, 3, 6, 8, 9, 10, 9, 8, 7, 5, 3, 0, 0, 0];
    var stemiArray = [0, 3, 5, 6, 7, 8, 7, 6, 5, 3, 0, 0, 0, -2.5, -5, 35, 60, 34, 12, 13, 13, 16, 19, 22, 24, 26, 27, 26, 24, 21, 18, 14, 10, 5, 0, 0];
    var afArray = [-2.5, -5, 35, 60, 34, -7, 0, 0, 0, 3, 6, 8, 9, 10, 9, 8, 7, 5, 3];
    var tdpArray = [0, -3, -4, -5, -5, -4, -3, -2, -1, 6, 12, 18, 24, 26, 28, 29, 31, 19, 8, -4, -15, -1, 13, 26, 40, 37, 34, 31, 28, 14, -1, -15, -30, -31, -33, -34, -35, -14, 6, 26, 47, 45, 44, 42, 42, 36, 30, 24, 18, 4, -10, -24, -38, -40, -41, -42, -44, -43, -43, -42, -42, -29, -16, -3, 11, 20, 30, 39, 49, 51, 52, 53, 54, 53, 51, 49, 47, 34, 21, 8, -6, -11, -17, -23, -28, -30, -31, -32, -32, -14, 5, 24, 43, 36, 19, -3, -22, -8, 6, 20, 34, 28, 23, 17, 12, 6, 1, -5, -11, -10, -9, -7, -6, 1, 9, 16, 23, 24, 24, 24, 25, 16, 8, 0, -8, -4, 1, 5, 10, 13, 17, 20, 23, 24, 25, 26, 26, 26, 25, 24, 23, 17, 12, 6, -1, -4, -9, -12, -16, -17, -18, -18, -19, -16, -12, -9, -6, 3, 12, 21, 31, 32, 33, 34, 35, 35, 35, 35, 35, 31, 27, 23, 19, 6, -7, -21, -35, -36, -37, -38, -39, -19, 2, 23, 43, 43, 42, 40, 39, 20, 1, -18, -37, -39, -42, -45, -48, -45, -43, -40, -37, -24, -11, 3, 16, 24, 32, 39, 47, 48, 49, 50, 51, 49, 48, 46, 45, 27, 10, -7, -25, -28, -31, -34, -37, -35, -33, -30, -28, -12, 9, 28, 39, 38, 37, 36, 36, 20, -1, -18, -26, -17, 2, 21, 30, 24, 11, -4, -14, -6, 6, 16, 21, 16, 5, -6, -11, -5, 6, 17, 22, 15, 0, -16, -23, -14, 5, 24, 33, 21, -5, -32, -44, -31, -2, 27, 40, 25, -6, -37, -52, -23, 10, 36, 47, 33, 3, -28, -41, -29, -3, 24, 36, 28, 11, -10, -28, -28, -28, -28, -29, -28, -27, -26, -26, -11, 6, 20, 26, 21, 9, -5, -19, -19, -19, -19, -19, -8, 4, 13, 17, 15, 11, 5, 0];
    var cprArray = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 44, 45, 46, 47, 46, 45, 44, 42, 39, 36, 33, 30, 27, 24, 21, 18, 15, 12, 9, 6, 3, 0];
    var svtArray = [0, -2.5, -5, 35, 60, 34, -7, 0, 0, 0, 3, 6, 8, 9, 10, 9, 8, 7, 5, 3];
    switch (wave) {
        case "vt":
            waveArray = vtArray;
            break;
        case "asystole":
            waveArray = aArray;
            break;
        case "nsr":
            waveArray = nsrArray;
            break;
        case "pea":
            waveArray = nsrArray;
            break;
        case "tdp":
            waveArray = tdpArray;
            break;
        case "stemi":
            waveArray = stemiArray;
            break;
        case "af":
            waveArray = afArray;
            break;
        case "aflutter":
            waveArray = afArray;
            break;
        case "cpr":
            waveArray = cprArray;
            break;
        case "svt":
            waveArray = svtArray;
            break;
        default:
            waveArray = aArray;
            break;
    }
    if (n >= waveArray.length - 1) {
        n = 0;
        animate = false;
        if (cpr == true) {
            if (cycleState == "onlyCompressions") {
                compressionsCounter++;
                if (compressionsCounter >= 30) {
                    compressionsCounter = 0;
                    cycleState = "onlyVentilations";
                    if (etco2Running) {
                        preCprVpm = vpm;
                        vpm = 25;
                        updateRR()
                    } else {
                        setTimeout(function () {
                            cycleState = "onlyCompressions"
                        }, 3000);
                    }
                }
            }
        }
    }
    return (waveArray[n] * -1);
}

function changeEnergy(d) {
    if (monitorOn == true && defibCharging == false) {
        if (energy + d <= 500 && energy + d >= 0) {
            switchSFX.play();
            energy += d;
            $("#energyValue").text(energy + "j")
        }
    }
}

function charge() {
    if (monitorOn == true) {
        if (defibCharging == false) {
            chargingSFX.play();
            defibCharging = true;
            $("#chargeButtonLabel").html("Charging<span class='longText'>...</span>");
            $("#chargeBarOutline").css("visibility", "visible");
            $("#energyValue").text(energy + "j");
            chargeTween = TweenMax.to($("#chargeBar"), energy / 100, {
                width: "100%",
                ease: Power0.easeNone,
                onComplete: charged
            });
            if (mobileAndTabletcheck()) {
                chargedSFX.load();
            }
        }
    }
}

function charged() {
    defibCharged = true;
    chargingSFX.pause();
    chargingSFX.currentTime = 0;
    $("#chargeButtonLabel").text("Charged").css({"backgroundColor": "", "color": ""});
    $("#chargeButtonLabel >span.longText").text("");
    $("#chargeBar").text("disarm");
    chargeFlash = TweenMax.to($("#chargeButtonLabel"), 0.05, {
        backgroundColor: "#ffff00",
        color: "#000000",
        repeat: -1,
        repeatDelay: 0.5,
        yoyo: true
    });
    chargeShockFlash = TweenMax.to($("#shockButtonLabel"), 0.05, {
        backgroundColor: "#ffffff",
        color: "#ff0000",
        repeat: -1,
        repeatDelay: 0.5,
        yoyo: true
    });
    if (mobileAndTabletcheck()) {
        chargedSFX.loop = true;
        chargedSFX.play();
    } else {
        chargedSFX.loop = true;
        chargedSFX.play();
    }
}

window.mobileAndTabletcheck = function () {
    var check = false;
    (function (a) {
        if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true
    })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
};

function disarm() {
    if (defibCharged == true) {
        defibCharged = false;
        defibCharging = false;
        shocking = false;
        chargeFlash.kill();
        chargeShockFlash.kill();
        $("#chargeButtonLabel").text("Charge").css({"backgroundColor": "", "color": ""});
        $("#chargeButtonLabel").css({"backgroundColor": "", "color": ""});
        $("#shockButtonLabel").css({"backgroundColor": "", "color": ""});
        $("#chargeBarOutline").css("visibility", "");
        $("#chargeBar").css({"width": "0%"});
        $("#chargeBar").text("");
        $("#energyValue").text("---");
        chargedSFX.pause();
        chargedSFX.currentTime = 0;
    }
}

function shock() {
    if (defibCharged == true) {
        defibCharged = false;
        defibCharging = false;
        shocking = true;
        chargeFlash.kill();
        chargeShockFlash.kill();
        $("#chargeButtonLabel").text("Charge").css({"backgroundColor": "", "color": ""});

        $("#shockButtonLabel").css({"backgroundColor": "", "color": ""});
        $("#chargeBar").css({"width": "0%"}).text("");
        $("#chargeBarOutline").css("visibility", "");
        $("#energyValue").text("---");
        energy = 200;
        shockCounter++;
        $("#shockDisplay").text("Shocks: " + shockCounter);
        compressionsCounter = 0;
        ventilationsCounter = 0;
        if (shockCounter == rhythmChangeOnShock) {
            rhythm = postShockRhythym;
            ecgSet = false;
        }
        if (shockCounter >= roscOnShock) {
            rhythm = roscRhythym;
            ecgSet = false;
            rosc = true;
            updateVars();
            clearCprTimerout()
        }
        setTimeout(function () {
            shocking = false;
            n = 0;
            spo2n = 0;
        }, 3000);
        chargedSFX.pause();
        chargedSFX.currentTime = 0;
    }
}

function recordBP() {
    if (monitorOn == true &&
        bprunning == false &&
        shocking == false &&
        rhythm != "vf" &&
        rhythm != "vt" &&
        rhythm != "asystole" &&
        rhythm != "pea"
    ) {
        switchSFX.play();
        bprunning = true;
        $("#bpButtonP").css({"background-color": "#ffffff", "color": "#000000"});
        $("#bpButtonP > span.longText").text("Recording ");
        console.log(maxSysBP.constructor, minSysBP);
        sysBP = Math.floor(Math.random() * (maxSysBP - minSysBP + 1)) + minSysBP;
        diaBP = Math.floor(Math.random() * (maxDiaBP - minDiaBP + 1)) + minDiaBP;
        var bpCount = 0;
        var maxBPCount = 8;
        var runBPdown;
        var runBPup = setInterval(function () {
            bpInterval = runBPup;
            if (bpCount == 0) {
                $("#bp").text(0);
            } else {
                var bp = Math.round((sysBP + 40) / (maxBPCount / bpCount));
                $("#bp").text(bp);
            }
            bpCount++;
            if (bpCount == maxBPCount) {
                clearInterval(runBPup);
                bpInterval = runBPdown;
                bpCount = 0;
                maxBPCount = 8;
                runBPdown = setInterval(function () {
                    if (bpCount == 0) {
                        $("#bp").text(sysBP + 40);
                    } else {
                        bp = Math.round((sysBP + 40) - ((sysBP + 40) * (bpCount / maxBPCount)));
                        $("#bp").text(bp);
                    }
                    bpCount++;
                    if (bpCount == maxBPCount) {
                        $("#bp").text(sysBP + "/" + diaBP);
                        bpCount = 0;
                        maxBPCount = 8;
                        clearInterval(runBPdown);
                        $("#bpButtonP").css({"background-color": "", "color": ""});
                        $("#bpButtonP > span.longText").text("Record ");
                        bprunning = false;
                    }
                }, 1000)
            }
        }, 500);

    }
}

function cancelBP() {
    if (bprunning) {
        bprunning = false;
        clearInterval(bpInterval);
        $("#bpButtonP").css({"background-color": "", "color": ""});
        $("#bpButtonP > span.longText").text("Record ");
        $("#bp").text("---/---")
    }
}

function onResize() {
    initaliseCanvas()
}

function updateActions() {
    cpr = $("#cprButton").prop("checked");
    ventilating = $("#ventButton").prop("checked");
    intubated = $("#intubatedButton").prop("checked");
    if (cpr && monitorOn) {
        $("#cprDisplay").css("display", "inline-block")
    } else {
        $("#cprDisplay").css("display", "")
    }
    if (ventilating && monitorOn) {
        $("#ventDisplay").css("display", "inline-block")
    } else {
        $("#ventDisplay").css("display", "")
    }
    if (intubated && monitorOn) {
        $("#intubatedDisplay").css("display", "inline-block")
    } else {
        $("#intubatedDisplay").css("display", "")
    }
    if (cpr == true && ventilating == true && intubated == false) {
        cycleState = "onlyCompressions";
    } else {
        cycleState = "noCycle";
        vpm = $("#vpmBox").val();
        updateRR();
    }
    makeQuery();
}

function updateSettings() {
    rhythm = $("#presentingRhythmBox").val();
    postShockRhythym = $("#postShockRhythmBox").val();
    rhythmChangeOnShock = $("#postRhythmShockNum").val();
    roscRhythym = $("#roscRhythmBox").val();
    roscOnShock = $("#roscRhythmShockNum").val();
    rhythmChangeAfterCpr = $("#postCPRRhythmBox").val();
    rhythmChangeAfterCprSeconds = $("#postCprTimeBox").val();
    clearCprTimerout();
    if (rhythmChangeOnShock > roscOnShock) {
        roscOnShock = Number(rhythmChangeOnShock + 1)
    }
    n = 0;
    shockCounter = 0;
    $("#shockDisplay").text("");
    makeQuery();
}

function clearCprTimerout() {
    if (cprTimeout) {
        clearTimeout(cprTimeout);
        cprTimeout = undefined;
    }
}

function updateVars() {
    bpm = Number($("#heartRateBox").val());
    n = 0;
    brpm = Number($("#breathingRateBox").val());
    updateHR();
    updateRR();
    sats = Number($("#satsBox").val());
    spo2Set = false;
    vCo2 = Number($("#co2Box").val());
    bCo2 = Number($("#bCo2Box").val());
    etco2Set = false;
    maxSysBP = Number($("#maxSysBox").val());
    maxDiaBP = Number($("#maxDiaBox").val());
    minSysBP = Number($("#minSysBox").val());
    minDiaBP = Number($("#minDiaBox").val());
    if (maxSysBP < minSysBP) {
        maxSysBP = minSysBP + 10;
    }
    if (maxDiaBP < minDiaBP) {
        maxDiaBP = minDiaBP + 10;
    }
    makeQuery();
}

function updateHR() {
    if (hr) {
        clearInterval(hr);
    }
    beatInterval = (1000 / (bpm / 60));
    hr = setInterval(pulse, beatInterval);
    ecgSet = false;
}

function updateRR() {
    if (ventilating == true) {
        respInterval = 1000 / (vpm / 60);
    } else {
        respInterval = 1000 / (brpm / 60);
    }
    if (rr) {
        clearInterval(rr)
    }
    etco2Set = false;
    rr = setInterval(breathing, respInterval);
}

function mapKeys() {
    document.onkeydown = function (e) {
        //e = e || window.event;
        switch (e.which) {
            case 9:
                monitorTurnOnOff();
                e.preventDefault();
                break;
            case 13:
                charge();
                e.preventDefault();
                break;
            case 32:
                shock();
                e.preventDefault();
                break;
            case 38:
                changeEnergy(10);
                e.preventDefault();
                break;
            case 40:
                changeEnergy(-10);
                e.preventDefault();
                break;
            case 66:
                recordBP();
                e.preventDefault();
                break;
            case 67:
                $("#cprButton").prop("checked", !$("#cprButton").prop("checked"));
                updateActions();
                e.preventDefault();
                break;
            case 68:
                disarm();
                e.preventDefault();
                break;
            case 69:
                etco2On();
                e.preventDefault();
                break;
            case 86:
                $("#ventButton").prop("checked", !$("#ventButton").prop("checked"));
                updateActions();
                e.preventDefault();
                break;
            case 73:
                $("#intubatedButton").prop("checked", !$("#intubatedButton").prop("checked"));
                updateActions();
                e.preventDefault();
                break;
            case 77:
                metronomeOn();
                e.preventDefault();
                break;
            case 83:
                spo2On();
                e.preventDefault();
                break;
        }
    };
    // $(window).bind('keypress', function(e){
    //});
}

function metronomeOn() {
    if (monitorOn) {
        switchSFX.play();
        if (ticking) {
            ticking = false;
            clearInterval(tickInterval);
            $("#metronomeButtonLabel").css({"background-color": "", "color": ""});
            $("#metronomeButtonLabel > span.longText").text(" off");
        } else {
            if (mobileAndTabletcheck()) {
                tickSFX.load();
            }
            tickInterval = setInterval(function () {
                tickSFX.play();
            }, (1000 * 60) / 100);
            ticking = true;
            $("#metronomeButtonLabel").css({"background-color": "#ffffff", "color": "#000000"});
            $("#metronomeButtonLabel > span.longText").text(" on");
        }
    }
}

function showSettings() {
    $("#optionsWrap").slideToggle();
    $("#sliderArrow").toggleClass("fa fa-caret-right").toggleClass("fa fa-caret-down")
}

function defaultSettings() {
    window.location.hash = "#?a=0&b=1&c=2&d=5&e=1&f=3&g=150&h=70&i=18&j=99&k=35&l=130&m=80&n=110&o=60&p=55&q=12";
    queryRead = false;
    getQuery();
}

function waveClick(target) {
    if (monitorOn) {
        switch (target) {
            case "ecg":
                $("#cprButton").prop("checked", !$("#cprButton").prop("checked"));
                updateActions();
                break;
            case "spo2":
                $("#intubatedButton").prop("checked", !$("#intubatedButton").prop("checked"));
                updateActions();
                break;
            case "co2":
                $("#ventButton").prop("checked", !$("#ventButton").prop("checked"));
                updateActions();
                break;
        }
    }
}