import { h, Component } from 'preact';

export default class Icon extends Component {
  getSVG(props) {
    switch(props.icon) {
      case 'back':
        return <svg xmlns="http://www.w3.org/2000/svg" {...props}>
                  <path d="M0 0h24v24H0z" fill="none"/>
                  <path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20v-2z"/>
                </svg>
      case 'clear':
        return <svg xmlns="http://www.w3.org/2000/svg" {...props}>
                <path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6z"/>
                <path d="M0 0h24v24H0z" fill="none"/>
              </svg>
      case 'search':
        return <svg xmlns="http://www.w3.org/2000/svg" {...props}>
                <path d="M15.5 14h-.8l-.3-.3c1-1.1 1.6-2.6 1.6-4.2a6.5 6.5 0 1 0-2.3 5l.3.2v.8l5 5 1.5-1.5-5-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/>
                <path d="M0 0h24v24H0z" fill="none"/>
              </svg>
      case 'copy':
        return <svg xmlns="http://www.w3.org/2000/svg" {...props}>
                <path d="M0 0h24v24H0z" fill="none"/>
                <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/>
              </svg>
      case 'delete':
        return <svg xmlns="http://www.w3.org/2000/svg" {...props}>
                <path d="M6 19c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                <path d="M0 0h24v24H0z" fill="none"/>
              </svg>
      case 'menu':
        return <svg xmlns="http://www.w3.org/2000/svg" {...props}>
                <path d="M0 0h24v24H0z" fill="none"/>
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
      case 'add':
        return <svg xmlns="http://www.w3.org/2000/svg" {...props}>
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                <path d="M0 0h24v24H0z" fill="none"/>
              </svg>
    }
  }

  render(props) {
    return this.getSVG(props);
  }
}
