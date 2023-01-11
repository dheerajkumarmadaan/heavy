'use strict';
// Filename is gads.js to trigger ad detection

// add a timestamp to URLs to prevent caching
const loadedAt = Date.now();
document.querySelectorAll('input.nocache').forEach((e) => { e.setAttribute('value', loadedAt) });

// create an iframe for the add
const frame = document.createElement('iframe');
frame.setAttribute('allow', 'autoplay');
frame.setAttribute('id', 'topFrame');

let iframeSrc = './empty/adunit.html';
const urlParams = new URLSearchParams(window.location.search);

if (urlParams.get('ad')) {
  // drop in one of the hosted examples
  iframeSrc = urlParams.get('ad') + '?n=' + loadedAt;
} else if (urlParams.get('site')) {
  // or load the user's content
  iframeSrc = './proxy/adunit.html?site=' + encodeURIComponent(urlParams.get('site'));
}

// update the iframe URL and add it to the page
frame.src = iframeSrc;
frame.scrolling = 'no';
frame.style.height = '600px';
frame.style.width = '600px';
document.querySelector('main').appendChild(frame);

// Simple reporting mechanism that's just awaiting a postMessage from the ad frame
const unloadMessage = document.createElement('pre');
unloadMessage.id = 'interventionArea';
unloadMessage.textContent = '';
document.querySelector('main').appendChild(unloadMessage);

// Handle incoming messages from the iframes
function handlePostMessage(event) {
	try {
        const a = JSON.parse(event.data);
        // only add intervention messages
        if(a.type === 'intervention'){
            unloadMessage.textContent += '\n' + event.data;
        }

    } catch(e) {
        console.log("bad data"); // error in the above string (in this case, yes)!
    }
}

window.addEventListener('message', handlePostMessage, false);
