import User from './user-actions';
import Entry from './entry-actions';
import Global from './global-actions';

export default Object.assign(User, Entry, Global);
