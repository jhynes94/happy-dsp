// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

//Run this command to package up application for distribution
//electron-packager .

var dataModels = [];

function newData(){
    const {dialog} = require('electron').remote;
    
    var path = dialog.showOpenDialog({
        filters: [
            
               { name: 'text', extensions: ['txt'] }
            
              ],
        properties: ['openFile']
    });
   
    dataModels.push(new dataModel(path.toString()));
    console.log("New Data Model created");
}

class dataModel {

    constructor(pathToFile) {
        this.pathToFile = pathToFile;
        $('#FileOutput').text(pathToFile)
        this.readDataIn();
        this.fftData();



        
        this.plotData(this.decibels, 'spectrum');
        this.plotData(this.arrayOfData, 'timeDomain')
    }

    readDataIn () {

        const fs = require("fs");
    
        var data = fs.readFileSync(this.pathToFile);
        
        //Convert string of Data to Array of Floats
        this.arrayOfData = data.toString().split(/\r\n|\r|\n/g).map(function(i){
            return parseFloat(i);
        })

        //Clean Array of floats to remove NaN error at last place
        this.arrayOfData.splice(this.arrayOfData.length-1, 1);
    }

    fftData () {
        var ft = require('fourier-transform');
        var db = require('decibels');
    
        this.spectrum = ft(this.arrayOfData);
    
        //convert to decibels 
        this.decibels = this.spectrum.map((value) => db.fromGain(value))
    }

    plotData (spectrum, element) {
        var x = [];
        
        for (var i = 0; i < spectrum.length-1; i++) {
            x.push(i);
        }
    
        var TESTER = document.getElementById(element);
        Plotly.plot( TESTER, [{
        x: x,
        y: spectrum,
        mode: "lines",
        type: "scatter"
        }], {
            margin: { t: 0 }
        } );
    }


}