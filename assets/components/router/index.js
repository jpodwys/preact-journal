import { h, Component } from 'preact';
import fire from '../../js/fire';

export default class Router extends Component {
  matchView(view, children) {
    return children.filter(child => {
      let path = child.attributes.path;
      let paths = path.split('||');
      for(let i = 0; i < paths.length; i++){
        if(paths[i] === view) return true;
      }
      return false;
    });
  }

  render({ view, children, onChange }) {
    // if(typeof onChange === 'function') onChange(view, location.href);
    return this.matchView(view, children)[0];
  }
}
