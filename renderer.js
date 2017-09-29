// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

//Run this command to package up application for distribution
//electron-packager .


function UserException(message) {
    this.message = message;
    this.name = 'UserException';
}

class controller {

    constructor() {
        this.dataModels = [];
        this.showFreq = true;
        this.showTime = true;
    }

    //Creates new data Model
    newData() {

        var path = this.getFilePath();

        this.dataModels.push(new dataModel(path.toString()));
        console.log("New Data Model created");

        document.getElementById('DataSection').style.display = "inline"; //Show Data Page
        document.getElementById('LandingPage').style.display = "none"; // Hide Landing Page

        this.updateUserData();
    }

    updateUserData() {
        var dataModelNumber = 0;
        $('#THD').text(this.dataModels[dataModelNumber].getTHD());
        $('#THDN').text(this.dataModels[dataModelNumber].getTHDN());
        $('#SNR').text(this.dataModels[dataModelNumber].getSNR());
        $('#ENOB').text(this.dataModels[dataModelNumber].getENOB());
        $('#DC').text(this.dataModels[dataModelNumber].getDC());
        $('#startFreq').text("1");
        $('#stopFreq').text((this.dataModels[dataModelNumber].getRawData().length).toString());
    }

    getFilePath() {
        const { dialog } = require('electron').remote;
        
                var path = dialog.showOpenDialog({
                    filters: [
        
                        { name: 'text', extensions: ['txt'] }
        
                    ],
                    properties: ['openFile']
                });
                return(path);
    }
    
    BandData() {
        var startFreq = document.getElementById('startFreq').value;
        var stopFreq = document.getElementById('stopFreq').value;

        this.dataModels[0].getBandData(startFreq, stopFreq);
    }

    showFreqDomain() {
        this.showFreq = !this.showFreq;
        if (this.showFreq == true) {
            $('#showFreqDomain').text("Show Freq Domain")
            document.getElementById('spectrum').style.display = "none"; // Hide Landing Page
        }
        if (this.showFreq == false) {
            $('#showFreqDomain').text("Hide Freq Domain")
            document.getElementById('spectrum').style.display = "inline"; // Hide Landing Page
        }
    }

    showTimeDomain() {
        this.showTime = !this.showTime;
        if (this.showTime == true) {
            $('#showTimeDomain').text("Show Time Domain")
            document.getElementById('spectrum').style.display = "none"; // Hide Landing Page
        }
        if (this.showTime == false) {
            $('#showTimeDomain').text("Hide Time Domain")
            document.getElementById('spectrum').style.display = "inline"; // Hide Landing Page
        }
    }
}



/*
    Known problems:

    * Not sure if actual fft function is correct. Data from it does not compare the same to Richards and R studio, or Unison for that matter.
*/
class dataModel {

    constructor(pathToFile) {

        $('#FileOutput').text(pathToFile)

        //public variables
        this.pathToFile = pathToFile;
        this.rawData = this.readDataIn(this.pathToFile);
        this.fftData = this.fft(this.rawData);
        this.fftDataMag = this.magDataDb(this.fftData);
        this.harmonics = this.calcHarmonics(this.fftDataMag);
        this.THD = this.calcTHD(this.fftData, this.harmonics);
        this.THDN = this.calcTHDN(this.fftData, this.harmonics[1]);
        this.SNR = this.calcSNR(this.THDN, this.fftDataMag[this.harmonics[1]]);
        this.ENOB = this.calcENOB(this.SNR);
        this.DC = this.fftDataMag[0];

        this.plotData(this.fftDataMag, 'spectrum');
        this.plotData(this.rawData, 'timeDomain')
    }

    A_WeightedFrequencies(waveform) {
        //https://www.npmjs.com/package/a-weighting
        var aWeight = require('a-weighting/a');
        var ft = require('fourier-transform');
        var frequencies = ft(waveform).map(function (magnitude, i, data) {
            var frequency = 22050 * i / data;

            return aWeight(frequency) * magnitude;
        });
        return (frequencies)
    }

    readDataIn(pathToFile) {

        const fs = require("fs");

        var data = fs.readFileSync(pathToFile);

        //Convert string of Data to Array of Floats
        var arrayOfData = data.toString().split(/\r\n|\r|\n/g).map(function (i) {
            return parseFloat(i);
        })

        //Clean Array of floats to remove NaN error at last place
        arrayOfData.splice(arrayOfData.length - 1, 1)

        return (arrayOfData);
    }

    fft(rawData) {
        var ft = require('fourier-transform');
        var db = require('decibels');

        var spectrum = ft(rawData);

        return (spectrum)
    }

    magDataDb(fftData) {
        //convert to decibels 
        var db = require('decibels');
        var decibels = fftData.map((value) => db.fromGain(value))

        return (decibels);
    }

    calcHarmonics(fftDataArray) {

        //Find the Fundemental Freq by searching for largest freq besides DC
        var largestValueIndex = -1;
        var largestValue = -200;
        for (var i = 1; i < fftDataArray.length - 1; i++) {
            if (fftDataArray[i] > largestValue) {
                largestValue = fftDataArray[i];
                largestValueIndex = i;
            }
        }

        //index 1 has fundemental, going upward
        var harmonicIndex = [];
        harmonicIndex.push(0);
        harmonicIndex.push(largestValueIndex);


        //Search for harmonic in range
        function findLargestValueIndexInRange(array, range, searchIndex) {

            //if Search index is greater than array, the harmonic is out of range
            if (searchIndex + range > array.length) {
                return (-1);
            }

            var largestValueInRange = -200; //-Infinity
            var largestValueInRangeIndex = searchIndex;
            for (var i = searchIndex - range; i <= searchIndex + range; i++) {
                if (array[i] > largestValueInRange) {
                    largestValueInRange = array[i];
                    largestValueInRangeIndex = i;
                }
            }
            return (largestValueInRangeIndex);
        }



        var numberOfHarmonics = 10
        for (var i = 2; i <= numberOfHarmonics; i++) {

            var sampleHarmonic = findLargestValueIndexInRange(fftDataArray, 5, harmonicIndex[1] * i);

            if (sampleHarmonic == -1) {
                //quit for loop
                i = numberOfHarmonics + 1;
            }
            else {
                harmonicIndex.push(sampleHarmonic);
            }
        }

        for (var i = 1; i < harmonicIndex.length; i++) {
            console.log(i + ": " + harmonicIndex[i] + " " + fftDataArray[harmonicIndex[i]].toString())
            $('#' + i + 'Harmonic').text(fftDataArray[harmonicIndex[i]].toString())
        }

        return (harmonicIndex);
    }

    calcTHD(data, harmonicIndex) {
        var THD = -300;

        var HarmonicAmplitudesSquared = 0;
        for (var i = 2; i < harmonicIndex.length; i++) {
            HarmonicAmplitudesSquared = HarmonicAmplitudesSquared + Math.pow(data[harmonicIndex[i]], 2)
        }

        THD = Math.sqrt(HarmonicAmplitudesSquared);

        THD = THD / data[harmonicIndex[1]];

        THD = 20 * Math.log10(THD);


        if (THD == -300) {
            console.log("THD Calculation Failed");
        }
        else {
            return (THD);
        }
    }

    calcTHDN(data, fundementalIndex) {

        var SumOfAmplitudes = 0;
        //Start after the DC bin
        for (var i = 1; i < data.length; i++) {
            if (i != fundementalIndex && i != fundementalIndex + 1 && i != fundementalIndex - 1) {
                SumOfAmplitudes = SumOfAmplitudes + Math.pow(data[i], 2)
            }
        }

        var THDN = Math.sqrt(SumOfAmplitudes);

        THDN = THDN / data[fundementalIndex];

        THDN = 20 * Math.log10(THDN)


        if (THDN == -300) {
            console.log("THDN Calculation Failed");
        }
        else {
            return (THDN);
        }
    }

    calcSNR(THDN, fundemental) {
        return (THDN / fundemental);
    }

    calcENOB(SNR) {
        var ENOB = (SNR - 1.76) / 6.02;
        return (ENOB);
    }

    //Getters
    getRawData(){
        return(this.rawData);
    }

    getHarmonics() {
        return(this.harmonics);
    }

    getTHD() {
        return(this.THD);
    }

    getTHDN() {
        return(this.THDN);
    }

    getSNR() {
        return(this.SNR);
    }

    getENOB() {
        return(this.ENOB);
    }

    getDC() {
        return(this.DC);
    }


    plotData(spectrum, element) {
        var x = [];

        for (var i = 0; i < spectrum.length - 1; i++) {
            x.push(i);
        }


        var trace = {
            type: 'scatter',                    // set the chart type
            mode: 'lines',                      // connect points with lines
            x: x,
            y: spectrum,
            line: {                             // set the width of the line.
                width: 2,
                color: 'rgb(71,23,246)'
            }
        };

        var layout = {
            //dragmode: 'lasso', //ADDED  https://codepen.io/etpinard/pen/OMgWjz
            yaxis: {
                title: "dB",
                color: 'rgb(231,223,221)'
            },
            xaxis: {
                title: "Bin",
                showgrid: false,
                color: 'rgb(231,223,221)'
            },
            margin: {                           // update the left, bottom, right, top margin
                l: 40, b: 40, r: 40, t: 40
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
        };

        Plotly.plot(document.getElementById(element), [trace], layout, { showLink: false });

        document.getElementById(element).on('plotly_selected', function (eventData) {
            var x = [];
            var y = [];

            var colors = [];
            for (var i = 0; i < N; i++) colors.push(color1Light);

            console.log(eventData.points)

            eventData.points.forEach(function (pt) {
                x.push(pt.x);
                y.push(pt.y);
                colors[pt.pointNumber] = color1;
            });

            Plotly.restyle(graphDiv, {
                x: [x, y],
                xbins: {}
            }, [1, 2]);

            Plotly.restyle(graphDiv, 'marker.color', [colors], [0]);
        });



    }
}





var control = new controller();