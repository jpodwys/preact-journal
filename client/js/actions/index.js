import Global from './global-actions';
import User from './user-actions';
import Entry from './entry-actions';
import Media from './media-actions';

export default Object.assign(Global, User, Entry, Media);
