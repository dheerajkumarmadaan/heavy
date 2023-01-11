// Copyright 2017 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var adsManager;
var adsLoader;
var adDisplayContainer;
var playButton;
var videoContent;
var adsInitialized;
var autoplayAllowed;
var autoplayRequiresMuted;

function initDesktopAutoplayExample() {
  videoContent = document.getElementById('contentElement');
  // playButton = document.getElementById('playButton');
  // playButton.addEventListener('click', () => {
  //   // Initialize the container. Must be done via a user action where autoplay
  //   // is not allowed.
  //   adDisplayContainer.initialize();
  //   adsInitialized = true;
  //   videoContent.load();
  //   playAds();
  // });
  setUpIMA();
  // Check if autoplay is supported.
  checkMutedAutoplaySupport();
}

function checkMutedAutoplaySupport() {
  videoContent.volume = 0;
  videoContent.muted = true;
  var playPromise = videoContent.play();
  if (playPromise !== undefined) {
    playPromise.then(onMutedAutoplaySuccess).catch(onMutedAutoplayFail);
  }
}

function onMutedAutoplaySuccess() {
  // If we make it here, muted autoplay works but unmuted autoplay does not.
  autoplayAllowed = true;
  autoplayRequiresMuted = true;
  autoplayChecksResolved();
  console.log("autoplay success");
}

function onMutedAutoplayFail() {
  // Both muted and unmuted autoplay failed. Fall back to click to play.
  videoContent.volume = 1;
  videoContent.muted = false;
  autoplayAllowed = false;
  autoplayRequiresMuted = false;
  autoplayChecksResolved();
  console.log("autoplay fail");
}

function setUpIMA() {
  // Create the ad display container.
  createAdDisplayContainer();
  // Create ads loader.
  adsLoader = new google.ima.AdsLoader(adDisplayContainer);
  // Listen and respond to ads loaded and error events.
  adsLoader.addEventListener(
      google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      onAdsManagerLoaded, false);
  adsLoader.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR, onAdError, false);

  // An event listener to tell the SDK that our content video
  // is completed so the SDK can play any post-roll ads.
  videoContent.onended = contentEndedListener;
}

function contentEndedListener() {
  videoContent.onended = null;
  if (adsLoader) {
    adsLoader.contentComplete();
  }
}

function loadDoc(isRawVideoVast, isTag, settingsUrl, vastXmlUrl, adsRequest, inOdcEmulation) {
 console.log(isRawVideoVast, isTag, settingsUrl, vastXmlUrl, adsRequest);
 var url = settingsUrl !== null ? settingsUrl : (vastXmlUrl + '&inOdcEmulation='+inOdcEmulation);	
 var request = new XMLHttpRequest();
 request.open('GET', url); 
 request.send(null);

request.onreadystatechange = function () {
  var DONE = 4; // readyState 4 means the request is done.
  var OK = 200; // status 200 is a successful return.
  if (request.readyState === DONE) {
    if (request.status === OK) {

  if(isRawVideoVast == 'true') {
  	   adsRequest.adsResponse = request.responseText;
  }
  else {
  	if (isTag == 'true') {
      var content= JSON.parse(request.responseText).content;
      adsRequest.adTagUrl = content;
  } else {
      // content = content.replace(/\r?\n|\r/g, "");
      // console.log(content);
      var content= JSON.parse(request.responseText).content;
      adsRequest.adsResponse = content;
  }
  }
  // Specify the linear and nonlinear slot sizes. This helps the SDK to
  // select the correct creative if multiple are returned.
  adsRequest.linearAdSlotWidth = 600;
  adsRequest.linearAdSlotHeight = 400;

  adsRequest.nonLinearAdSlotWidth = 640;
  adsRequest.nonLinearAdSlotHeight = 150;

  console.log(autoplayAllowed, autoplayRequiresMuted);

  adsRequest.setAdWillAutoPlay(autoplayAllowed);
  adsRequest.setAdWillPlayMuted(autoplayRequiresMuted);
  adsLoader.requestAds(adsRequest);

    } else {
      console.log('Error: ' + request.status); // An error occurred during the request.
    }
  }
};
}

function autoplayChecksResolved() {
    // Request video ads.
  var adsRequest = new google.ima.AdsRequest();
  var urlParams = new URLSearchParams(decodeURI(window.location.search));
  var isTagUrl = urlParams.get('isTagUrl');
  var settingsUrl = urlParams.get('settingsUrl');
  var vastXmlUrl = urlParams.get('vastXmlUrl');
  var isRawVideoVast = urlParams.get('isRawVideoVast');
  var inOdcEmulation = urlParams.get('inOdcEmulation');
  loadDoc(isRawVideoVast, isTagUrl, settingsUrl, vastXmlUrl, adsRequest, inOdcEmulation);

}

function createAdDisplayContainer() {
  // We assume the adContainer is the DOM id of the element that will house
  // the ads.
  adDisplayContainer = new google.ima.AdDisplayContainer(
      document.getElementById('adContainer'), videoContent);
}

function playAds() {
  try {
    if (!adsInitialized) {
      adDisplayContainer.initialize();
      adsInitialized = true;
    }
    // Initialize the ads manager. Ad rules playlist will start at this time.
    adsManager.init(600, 360, google.ima.ViewMode.NORMAL);
    // Call play to start showing the ad. Single video and overlay ads will
    // start at this time; the call will be ignored for ad rules.
    adsManager.start();
  } catch (adError) {
    // An error may be thrown if there was a problem with the VAST response.
    videoContent.play();
  }
}

function onAdsManagerLoaded(adsManagerLoadedEvent) {
  // Get the ads manager.
  var adsRenderingSettings = new google.ima.AdsRenderingSettings();
  adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
  // videoContent should be set to the content video element.
  adsManager =
      adsManagerLoadedEvent.getAdsManager(videoContent, adsRenderingSettings);
  // Mute the ad if doing muted autoplay.
  const adVolume = (autoplayAllowed && autoplayRequiresMuted) ? 0 : 1;
  adsManager.setVolume(adVolume);

  // Add listeners to the required events.
  adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError);
  adsManager.addEventListener(
      google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, onContentPauseRequested);
  adsManager.addEventListener(
      google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
      onContentResumeRequested);
  adsManager.addEventListener(
      google.ima.AdEvent.Type.ALL_ADS_COMPLETED, onAdEvent);

  // Listen to any additional events, if necessary.
  adsManager.addEventListener(google.ima.AdEvent.Type.LOADED, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.STARTED, onAdEvent);
  adsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE, onAdEvent);
  playAds();

}

function onAdEvent(adEvent) {
  console.log(adEvent);
  // Retrieve the ad from the event. Some events (e.g. ALL_ADS_COMPLETED)
  // don't have ad object associated.

  if(adEvent.type === 'complete'){
      window.parent.postMessage({ code: 'Completed'}, '*');
      console.log('done');
  }
}

function onAdError(adErrorEvent) {
  // Handle the error logging.
  console.log(adErrorEvent.getError());
  adsManager.destroy();
  // Fall back to playing content.
  videoContent.play();
}

function onContentPauseRequested() {
  videoContent.pause();
  videoContent.onended = null;
}

function onContentResumeRequested() {
  videoContent.play();
  videoContent.onended = contentEndedListener;
}
