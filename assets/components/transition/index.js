import { h, Component } from 'preact';

export default class Transition extends Component {
  getInlineStyle(mounted, style) {
    return mounted
      ? ''
      : style;
  }

  getClassName(mounted, className, currentClassName){
    if(!className) return currentClassName || '';
    return mounted
      ? currentClassName + ' ' + className
      : currentClassName .replace(new RegExp(className, 'g'), '');
  }

  render({ children, mounted, className, inlineStyle }) {
    return (
      <div>
        {children.map(child => {
          child.attributes.style = this.getInlineStyle(mounted, inlineStyle);
          child.attributes = child.attributes || {class: ''};
          child.attributes.class = this.getClassName(mounted, className, child.attributes.class);
          return child;
        })}
      </div>
    );
  }
}
