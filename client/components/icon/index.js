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
    case 'share':
      return <g>
              <path d="M0 0h24v24H0z" fill="none"/>
              <path d="M18 16a3 3 0 00-2 .8l-7-4.1V12v-.7l7-4.1A3 3 0 0021 5a3 3 0 10-6 .7L8 9.8A3 3 0 003 12a3 3 0 005 2.2l7.2 4.2-.1.6a3 3 0 102.9-3z"/>
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
    case 'calendar':
      return <g>
            <path d="M0 0h24v24H0z" fill="none"/>
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 00-2 2v14c0 1.1.9 2 2 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </g>
    case 'logout':
      return <g>
            <path d="M16 17v-3H9v-4h7V7l5 5-5 5M14 2a2 2 0 012 2v2h-2V4H5v16h9v-2h2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2h9z"/>
          </g>
    case 'download':
      return <g>
            <path d="M5 20h14v-2H5m14-9h-4V3H9v6H5l7 7 7-7z"/>
          </g>
    case 'sun':
      return <g>
            <path d="M0 0h24v24H0z" fill="none"/>
            <path d="M6.8 4.8L5 3 3.6 4.5l1.7 1.8 1.5-1.5zM4 10.5H1v2h3v-2zm9-10h-2v3h2v-3zm7.5 4L19 3l-1.8 1.7 1.5 1.5 1.8-1.8zm-3.3 13.7L19 20l1.4-1.4-1.8-1.8-1.4 1.4zm2.8-7.7v2h3v-2h-3zm-8-5a6 6 0 100 12 6 6 0 000-12zm-1 17h2v-3h-2v3zm-7.5-4L5 20l1.8-1.7-1.5-1.5-1.8 1.8z"/>
          </g>
    case 'moon':
      return <g>
            <path d="M2 12a10 10 0 0013 9.5 10 10 0 010-19A10 10 0 002 12z"/>
          </g>
  }
}

export default (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" {...props}>
    { getSVG(props.icon) }
  </svg>
);
