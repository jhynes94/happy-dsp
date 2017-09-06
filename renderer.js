// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

//Run this command to package up application for distribution
//electron-packager .


const fs = require("fs");

class model {
    constructor(fileName) {
        this.fileName = fileName;
    }

    testFunction() {
        console.log("Function Called!")
    }
}


//Determine Path of file
function openFile () {
    const {dialog} = require('electron').remote;
    
    var path = dialog.showOpenDialog({
        filters: [
            
               { name: 'text', extensions: ['txt'] }
            
              ],
        properties: ['openFile']
    });

    readData(path.toString());
}

//Read data of file into RAM
function readData (pathToFile) {
    
    var data = fs.readFileSync(pathToFile);
    
    //Convert string of Data to Array of Floats
    var arrayOfData = data.toString().split(/\r\n|\r|\n/g).map(function(i){
        return parseFloat(i);
    })

    //Clean Array of floats to remove NaN error at last place
    arrayOfData.splice(arrayOfData.length-1, 1);

    fft(arrayOfData);

    $('#FileOutput').text(pathToFile)
  }

function fft(waveform) {
    var ft = require('fourier-transform');
    var db = require('decibels');

    var spectrum = ft(waveform);

    //convert to decibels 
    var decibels = spectrum.map((value) => db.fromGain(value))

    SpecPlot(decibels);
    TimeDomainPlot(waveform);
}

function TimeDomainPlot(timeDomainData) {
    x = [];
    
        for (i = 0; i < timeDomainData.length-1; i++) {
            x.push(i);
        }
        console.log(timeDomainData);
    
        TESTER = document.getElementById('timeDomain');
        Plotly.plot( TESTER, [{
        x: x,
        y: timeDomainData,
        mode: "lines",
        type: "scatter"
        }], {
            margin: { t: 0 }
        } );
}

function SpecPlot(spectrum) {
    x = [];

    for (i = 0; i < spectrum.length-1; i++) {
        x.push(i);
    }

    TESTER = document.getElementById('spectrum');
    Plotly.plot( TESTER, [{
    x: x,
    y: spectrum,
    mode: "lines",
    type: "scatter"
    }], {
        margin: { t: 0 }
    } );
}