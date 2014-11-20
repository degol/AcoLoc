/**
* @fileOverview
* @author <a href="mailto:degol.woldegaber@uni-rostock.de">Degol Sahle</a>
* @version 0.0
*/

/**
* mfskReceiverUR MFSK Receiver class .
* @class
* @param g Window object.
* @param document Document object for accessing the DOM.
*/

var mfskReceiverUR = function init(g, document){

/**
 Namespace for Cookies
 @namespace
*/

var global = {
/** Symbol duration
 @type float
*/
 mainInterval:0.0,
/** Tramsmission time
 @type float
*/
 revTime:0.0,
/** Start Frequency
 @type Integer
*/
 strFreq:0,
 /** Frequency Gap
  @type Integer
 */
 freqG:0,
 /** Guard Frequency
  @type Integer
 */
 guardFreq:0,
 /** Sensitivity in dB
  @type Integer
 */
 sensi:0;
 };



var gl = {
  input:{},  
  audio_context: {},
  analyser: {},
  updateInterval: 0,
  timer: 0,timer2: 0,
  timerLimit:0,
  realD:[],
  cf:0,
  suc:0,
  minIndex:0,
  indexGap:0,
  frequencyData:[],
  counter:0,
  winnersList:[],
  freqRangeGroup:[],
  flag:false,
  counter6:0,
  counter7:0,
  fData:[],
  MulArray:[],
  counterd:0,
  sil:0,
  eil:0,
  livecounter:0,
  fstart:0,
  guardIndex:0,
  guardFreq:0,
  symbolPoints:0,
  totalAverageEnergy:0,
  liveFlag:false
};

    try {
      gl.audio_context = new (g.AudioContext || g.webkitAudioContext);
      boom('Audio context is fine');
      // Ask permission to use Mic and get the stream
      navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
      boom('navigator.getUserMedia ' + (navigator.getUserMedia ? ' is fine' : 'fail'));
      
      navigator.getUserMedia(
        {audio:true},
        function(stream) {
    
    boom('Live stream is being recieved!!!');
    //Wrap the stream and send it to gl.analyser for fft analysis 
    g.gl.input = gl.audio_context.createMediaStreamSource(stream);
    
	//liveStreamSize=gl.analyser.frequencyBinCount
    //This function is called every 1/10 of a sec, and the array for fft is updated as the result
	
	//boom(gl.frequencyData[450]);   
    boom('Recieved information is below:');
  }, 
        function(e){boom('No live audio input ' + e);}
      );
    } catch (e) {
      alert('No web audio support in this browser');
    }

	
/** Initializes' the detector with the given configuration parameters.
   @function
   @public 
   @param {integer} startFrequency The starting frequency of the coming signal in Hz.
   @param {Integer} frequencyGap The frequency difference between consecutive symbols in Hz.
   @param {Integer} dBSensitivity The threshold in dB.
   @param {Integer} symbolDuration The time duration for each symbol in s.
   @param {Integer} symbolTransmitDuration The duration without the silent gaps in s.
 */ 
function initialize(startFrequency,frequencyGap,dBSensitivity,symbolDuration,symbolTransmitDuration){

  var difer = 0;
  
      global.strFreq = 18000 || startFrequency || parseInt(document.getElementById("startFrequency").value);
      global.freqG = 200 || frequencyGap || parseInt(document.getElementById("frequencyGap").value);
      global.sensi = -80 || dBSensitivity || -1*parseInt(document.getElementById("dBSensitivity").value);
	  global.mainInterval = 0.150 || symbolDuration || parseFloat(document.getElementById("symbolDuration").value);
	  global.revTime =100 || symbolTransmitDuration || parseFloat(document.getElementById("symbolTransmitDuration").value);
	  global.guardFreq = 200 || parseInt(document.getElementById("gf").value);

      gl.suc = 0;
      gl.analyser=gl.audio_context.createAnalyser(); 
      gl.analyser.fftsize = 22048 || parseInt(document.getElementById("fft").value);
      gl.updateInterval=Math.floor(gl.analyser.fftsize/gl.audio_context.sampleRate);
      gl.fstart = 200 || parseInt(document.getElementById("fstart").value);	  
      gl.sil = 2 || parseInt(document.getElementById("eil").value);
      gl.eil =2 || parseInt(document.getElementById("sil").value);	  	  
      gl.analyser.minDecibels=-100;
      gl.analyser.maxDecibels=-30;
      gl.input.connect(gl.analyser);
      difer = global.strFreq-global.freqG/2;
      gl.minIndex=Math.floor(((global.strFreq-global.freqG/2)*(gl.analyser.fftsize))/gl.audio_context.sampleRate);
      gl.indexGap=Math.floor(global.freqG*(gl.analyser.fftsize)/gl.audio_context.sampleRate); 
      gl.guardIndex = Math.floor(global.guardFreq*(gl.analyser.fftsize)/gl.audio_context.sampleRate); 
      gl.frequencyData = new Float32Array(gl.analyser.frequencyBinCount);
      gl.symbolPoints = 0;
	  
	  for(var k=0,dMul = gl.frequencyData.length - gl.minIndex ;k < dMul;k++){
     for(var i=0;i<9;i++){
         if((k>= (i*gl.indexGap + gl.guardIndex))  && (k <((i+1)*gl.indexGap - gl.guardIndex) )){
             gl.MulArray[k] = 1;
			 gl.symbolPoints++;
			}
        }
	}

      setInterval(liveAnalyse,1 );
}

/** <p>The getFloatFrequencyData is part of the AnalyserNode of  Audio Context, and is the core function in doing spectrum analysis.
    It windows the in coming streams using blackmans windows, and does DFT using the FFT algorithm. It computes the energies of 
	each frequency bin and copies it to the given array.</p>
            @name getFloatFrequencyData
            @function
			@param {Array} frequencyData Float32Array with a size half the samples per each live snap shot.
			@returns Energy in dBSensitivity of each frequency bin from the fft computation.
        */

/** <p>'liveAnalyse' is called every 5s, it does fft of the input signal and saves it
        in the array 'PowerSpectrumArray'. PowerSpectrumArray has the energy level in dBSensitivity
	    of each frequency bin from 0 to Nyquist frequency.</p>
	@function	
	@requires audio_context
    @private	
		
*/ 
function liveAnalyse(){

 var sum = 0;
 var winArray = [];
 
 gl.liveFlag = false;
 gl.totalAverageEnergy = 0;
 gl.counter=0;
 gl.livecounter++; 
 gl.winnersList.length = 0;
 winArray.length = 0;
	
 gl.analyser.getFloatFrequencyData(gl.frequencyData);

 for(var i = gl.minIndex, len = gl.frequencyData.length; i < len ; i++){ 
     if(gl.MulArray[i - gl.minIndex] == 1){
          winArray[i] = Math.pow(10, (0.1*gl.frequencyData[i]));
	      sum += winArray[i];
	    }
	   else if(gl.MulArray[i - gl.minIndex] === 0)
	      winArray[i] = 0;
		  
	 if((gl.frequencyData[i]>(gl.global.sensi)) && (gl.MulArray[i - gl.minIndex] == 1)){  
          gl.winnersList[gl.counter]=[winArray[i],i];
	      gl.counter++ ;
	      gl.liveFlag = true;
		  gl.livecounter = 0;
		  
	    }
	 
    }
 
gl.totalAverageEnergy = sum/gl.symbolPoints;

if(gl.livecounter > gl.fstart)
     gl.flag = false;
	 
decisionMaker(gl.winnersList);
	
}
/** <p>decisionMaker' takes a two dimensional array, which has the energy levels at [x][0] 
       and their corresponding index numbers at [x][1].Decision is made through a series of
	   conditional statements. Each satisfied condition  sums the energy and at the end,the 
	   highest energy difference between the overall energy and the individual energy regions 
	   is declared the winner.</p>
 @function	   
 @private
 @param {Array} win An array which contains the the energy value and their corresponding bin position in the fft.
*/
function decisionMaker(win){

  var maxAverageEnergy=0,
      winnerIndex=0,      
      linearPowerthreshold = 0.03;
      
for(var p=0;p<8;p++){
	 gl.freqRangeGroup[p]=[0,0];
}

 
  if(gl.liveFlag){
     for(var y=0, len = win.length;y < len;y++){
	  Inner:
	     for(var j=0, len2 = gl.freqRangeGroup.length;j < len2;j++){
		     if(((win[y][1])>= (gl.minIndex + j*gl.indexGap + gl.guardIndex)) && ((win[y][1])< (gl.minIndex + (j+1)*gl.indexGap - gl.guardIndex)  )){
                 gl.freqRangeGroup[j][1]++;
			     gl.freqRangeGroup[j][0] += win[y][0];
			     break Inner;
			    }
			}	     
        }
		
	 for(var t = 0, len3 = gl.freqRangeGroup.length,instantAverageEnergy = 0; t < len3;t++){
	     instantAverageEnergy = (((gl.freqRangeGroup[t][0])/(gl.freqRangeGroup[t][1])) - gl.totalAverageEnergy);
         if(instantAverageEnergy > maxAverageEnergy){
             winnerIndex = t;
             maxAverageEnergy = instantAverageEnergy;		      
		    }
		}
    }

if(maxAverageEnergy > linearPowerthreshold){ 
     saveSequence(winnerIndex);
    }

}
/**
  <p>'saveSequence' is used to clean up the decided symbols coming from the decision maker.
     Due to the 80% overlap in the consecutive series of inputs in the 'liveAnalyser' function, the clean up is important.
     And the overlap is important to prevent the effect of the windowing.</p>
	 
  <p>The clean up is done by self synchronizing the coming stream of decided symbols.
	 This is done by holding a time right when a starting sequence is identified,
	 and cutting the sequence at the exact time of a symbol duration. </p>
 @function
 @private 
 @param {Integer} winner An integer which represents the location of the decided symbol in the spectrum.
*/
function saveSequence(winner){

var bg = gl.sil,
    en = gl.eil;
	
if((winner==6)&&(!gl.flag)){
     gl.counter6++;
     gl.timer = gl.audio_context.currentTime;
	 
     if(gl.counter6>bg){
         gl.flag=true;
	     gl.counter6=0;
		 gl.cf=0;
	    }
    }
else if((winner==7)&&(gl.flag)){
     gl.counter7++;
     if(gl.counter7>en){
         gl.flag=false;	
		 decode(removeRep(gl.realD));
		 gl.realD.length = 0;
		 gl.counter7=0;
		 gl.counterd=0;
		 gl.fData.length=0;
		 gl.cf = 0;
		}
    }
else if(gl.flag){
     gl.fData[gl.counterd]=winner;
     gl.counterd++;
	 gl.timer2 = gl.audio_context.currentTime;
	 gl.timerLimit = gl.cf*gl.global.mainInterval + gl.global.revTime;  
	 if((gl.timer2 - gl.timer) > gl.timerLimit){		      
		 gl.realD[gl.cf] = findMajority(gl.fData);
		 gl.counterd = 0;
         gl.fData.length = 0;
		 gl.cf++;		  
		}
	}
}

/**
   <p>Takes the list of decided symbols, represented in numbers indicating their position 
   in the spectrum,  and decodes the message. This function depends works in 
   reciprocity of the encoding used in the transmitting part, and is dependent on it.</p> 
   @function
   @private
   @param {String} stemp A string which represents the sequence of decided symbols, from the start to end of synchonization bits.
*/

function decode(stemp){

var ftemp="",
    gtemp ="",
    dtemp ="",
    strtemp="",
    ktemp='';
    strtemp = convertToString(stemp);	
	for(var i=0, len = strtemp.length;i < len;i++){
         if(strtemp.charAt(i)=="6")
	         continue ;
	     else if(strtemp.charAt(i)=="5")
	         continue ;
         else if(strtemp.charAt(i)=="7")
	         continue ;
	     else{
	         ftemp+=strtemp.charAt(i);
	        }
        }
   for(var v=0, len2 = ftemp.length;v < len2;v++){  
         if(ftemp.charAt(v)=="0")
	         gtemp+="00";
	     else if(ftemp.charAt(v)=="1")
	         gtemp+="01" ;
         else if(ftemp.charAt(v)=="2")
	         gtemp+="10" ;
	     else if(ftemp.charAt(v)=="3")
	         gtemp+="11" ;
	     else if(ftemp.charAt(v)=="4")
	         gtemp+="/" ;
        }
   ktemp=gtemp.split("/"); 
   for(var a=0, len3 = ktemp.length;a < len3;a++){
      if(ktemp[a].length==8){
         ktemp[a]=ktemp[a].slice(0,7);
		}
      dtemp+=String.fromCharCode(parseInt(ktemp[a], 2));
    }
//if(dtemp == "A"){
//gl.suc++	
//boom9(dtemp);
//}
}

/** 
   Finds the symbol which is represented most in a space of time which equals a symbol duration.
   @function
   @private
   @Param {Integer} majArr A row array of Integers which represents the decided symbols.
   @returns {String} The most occurring symbol representation.
*/

function findMajority(majArr){
var temp=[],
    maj=0,
	max=0; 
 for(var y=0;y<10;y++)
     temp[y]=0;
 for(var i=0, len = majArr.length;i < len;i++){
     for(var j=0;j<10;j++)
         if(majArr[i] == j)
             temp[j]++;
	}  
for(var h=0;h<10;h++){
     if(temp[h] > max){
	     max = temp[h];
		 maj=h;
		}
    }
return maj;
}
/** 
   Helping function to convert Integers to Strings for convenience.
   @function
   @private
   @Param {Integer} temp an array of Integers which represents the decided symbols.
   @returns {String} The String representation.
*/
function convertToString(temp){
var str="";
for(var i=0, len = temp.length;i < len;i++){
     str+= temp[i].toString();
	}
return str;
}
/** 
   Removes any repeating symbol representations.
   @function
   @private
   @param {Array} kata An array representing raw message with repeating symbols dues to the overlapping.
   @returns {Array} The array with the repeating vlaues removed.
*/
function removeRep(kata){
var temp=[],
    c=0,
 cData=kata;
 for(var i=0, len = cData.length;i < len;i++){ 
     if(cData[i]==cData[i+1])
	     continue;
	 else{          
	     temp[c]=cData[i];
	     c++;
		}  
    }
return temp;    
cData.length=0;
c=0;
}

return {initialize: initialize};
}(window, document);
	