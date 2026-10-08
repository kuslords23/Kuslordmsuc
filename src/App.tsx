// To play anthem for a match
musicIframe.contentWindow.postMessage(
  { type: 'PLAY_ANTHEM', payload: { matchId: 'sm-1' } },
  musicIframeOrigin
);

// To get current state
musicIframe.contentWindow.postMessage(
  { type: 'GET_STATE' },
  musicIframeOrigin
);

// To toggle play/pause
musicIframe.contentWindow.postMessage(
  { type: 'TOGGLE_PLAY' },
  musicIframeOrigin
);