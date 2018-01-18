import { h, Component } from 'preact';
import { Link } from 'preact-router/match';
import fire from '../../js/fire';

export default class Header extends Component {
	render() {
		return (
			<header>
				<h1>Journalize</h1>
				<nav>
					<Link href="/entries">Entries</Link>
					<Link href="/entry/new">Create</Link>
					<Link href="#" onClick={fire('logout')}>Logout</Link>
				</nav>
			</header>
		);
	}
}
