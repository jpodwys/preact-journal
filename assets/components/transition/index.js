import { h, Component } from 'preact';

export default class Transition extends Component {
  state = {mounted: false};

  componentDidMount() {
    this.setState({mounted: true});
  }

  getClassName(mounted, className, currentClassName){
    return mounted
      ? currentClassName + ' ' + className
      : currentClassName;
  }

  render({ children, className }, { mounted }) {
    return (
      <div>
        {children.map(child => {
          child.attributes = child.attributes || {class: ''};
          child.attributes.class = this.getClassName(mounted, className, child.attributes.class);
          return child;
        })}
      </div>
    );
  }
}
