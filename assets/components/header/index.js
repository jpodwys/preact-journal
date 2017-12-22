import { h, Component } from 'preact';
import { Link } from 'preact-router/match';

export default class Header extends Component {
	render() {
		return (
			<header>
				<h1>Journalize</h1>
				<nav>
					<Link href="/">Entries</Link>
				</nav>
			</header>
		);
	}
}
