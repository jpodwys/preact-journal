import Global from './global-actions';
import User from './user-actions';
import Entry from './entry-actions';
import Image from './image-actions';

export default Object.assign(Global, User, Entry, Image);
