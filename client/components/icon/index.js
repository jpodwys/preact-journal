import { h } from 'preact';

function getSVG(icon) {
  switch(icon) {
    case 'back':
      return <g>
              <path d="M0 0h24v24H0z" fill="none"/>
              <path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20v-2z"/>
            </g>
    case 'clear':
      return <g>
              <path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6z"/>
              <path d="M0 0h24v24H0z" fill="none"/>
            </g>
    case 'search':
      return <g>
              <path d="M15.5 14h-.8l-.3-.3c1-1.1 1.6-2.6 1.6-4.2a6.5 6.5 0 1 0-2.3 5l.3.2v.8l5 5 1.5-1.5-5-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/>
              <path d="M0 0h24v24H0z" fill="none"/>
            </g>
    case 'copy':
      return <g>
              <path d="M0 0h24v24H0z" fill="none"/>
              <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/>
            </g>
    case 'delete':
      return <g>
              <path d="M6 19c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              <path d="M0 0h24v24H0z" fill="none"/>
            </g>
    case 'menu':
      return <g>
              <path d="M0 0h24v24H0z" fill="none"/>
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </g>
    case 'left':
      return <g>
              <path d="M15.4 7.4L14 6l-6 6 6 6 1.4-1.4-4.6-4.6z"/>
              <path d="M0 0h24v24H0z" fill="none"/>
            </g>
    case 'star-empty':
      return <g>
            <path d="M22 9.2l-7.2-.6L12 2 9.2 8.6 2 9.2 7.5 14l-1.7 7 6.2-3.7 6.2 3.7-1.6-7L22 9.2zm-10 6.2l-3.8 2.3 1-4.3L6 10.5l4.4-.4 1.7-4 1.7 4 4.4.4-3.3 2.9 1 4.3-3.8-2.3z"/>
            <path d="M0 0h24v24H0z" fill="none"/>
          </g>
    case 'star-filled':
      return <g>
            <path d="M0 0h24v24H0z" fill="none"/>
            <path d="M12 17.3l6.2 3.7-1.7-7L22 9.2l-7.2-.6L12 2 9.2 8.6 2 9.2 7.5 14l-1.7 7z"/>
            <path d="M0 0h24v24H0z" fill="none"/>
          </g>
  }
}

export default (props) => (
  <button data-is="svg" {...props}>
    <svg xmlns="http://www.w3.org/2000/svg">
      { getSVG(props.icon) }
    </svg>
  </button>
);
