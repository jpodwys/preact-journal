import { h, Component } from 'preact';
import fire from '../../js/fire';

export default class Switch extends Component {
  matchView(caseProp, caseVal, children) {
    return children.filter(child => {
      let path = child.attributes[caseProp];
      let paths = path.split('||');
      for(let i = 0; i < paths.length; i++){
        if(paths[i] === caseVal) return true;
      }
      return false;
    });
  }

  render({ caseProp, caseVal, children }) {
    return this.matchView(caseProp, caseVal, children)[0];
  }
}
