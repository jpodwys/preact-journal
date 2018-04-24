import { h, Component } from 'preact';

export default class Transition extends Component {
  state = {mounted: false};

  componentDidMount() {
    this.setState({mounted: true});
  }

  componentWillUnmount() {
    this.setState({mounted: false});
  }

  getClassName(mounted, className, currentClassName){
    return mounted
      ? currentClassName + ' ' + className
      : currentClassName .replace(new RegExp(className, 'g'), '');
  }

  render({ children, className }, { mounted }) {
    return (
      <div>
        {children.map(child => {
          child.attributes.class = this.getClassName(mounted, className, child.attributes.class)
          return child;
        })}
      </div>
    );
  }
}
