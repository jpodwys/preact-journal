import { h } from '../../packages/kyvo/core';
import { debounced } from '../../packages/kyvo/helpers';
import Icon from '../icon';
import { app, viewEntries, selected } from '../../js/app-state';
import { isNew } from '../../js/sync/record';
import { filterByText, clearFilters, showConfirmDeleteEntryModal, toggleFavorite } from '../../js/actions/entry-actions';

const cancelAndBlur = e => {
	e.preventDefault();
	e.currentTarget.elements.fi.blur();
}

const onBack = e => {
	if(e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button !== 0) return;
	e.preventDefault();
	e.stopPropagation();
	history.back();
};


export default (props, ctx) => {
	const search = debounced(ctx, e => filterByText(e.target.value), 100);
	const { view, userId, filter, filterText } = app, [entry] = selected();
	if(!userId || view === '/switch') return;
	const entryCount = viewEntries().length;
	const filterIcon = filter === '' ? 'star-empty' : 'star-filled';
	const filterTo = filter === '' ? 'favorites' : '';
	const favoriteIcon = entry && entry.favorited ? 'star-filled' : 'star-empty';
	const isEntry = view === '/entry' || view === '/new';

	return (
		<header class="dark-fill">
			<div class="inner-header">
				<div class="nav-set">
					{view === '/entries' &&
						<span class="h3 fade-down">{`${entryCount} Entries`}</span>
					}

					{(view === '/search' || isEntry) &&
						<a href={view !== '/search' && (filter || filterText) ? '/search' : '/entries'} onclick={onBack} aria-label="Back">
							<Icon icon="back" key="header-back" class="fade-up"/>
						</a>
					}
				</div>

				<div class="nav-set flex-grow nav-search">
					{view === '/search' &&
						<form class="search-form fade-up" onsubmit={cancelAndBlur} aria-label="Search">
							<span class="nav-set">
								<Icon icon={filterIcon} onclick={() => { app.filter = filterTo; }} role="button" aria-label="Toggle favorites filter"/>
							</span>
							<input
								id="fi"
								autocomplete="off"
								value={filterText}
								placeholder="Search"
								oninput={search}/>
							<span class="nav-set">
								<span class="search-entry-count">{entryCount}</span>
							</span>
							<span class="nav-set">
								<Icon icon="clear" key="header-clear" onclick={clearFilters} role="button" aria-label="Clear filters"/>
							</span>
						</form>
					}
				</div>

				<div class="nav-set">
					{view === '/entries' &&
						<a href="/search" aria-label="Search">
							<Icon icon="search" onclick={() => setTimeout(() => document.getElementById('fi').focus(), 200)} key="header-search" class="fade-down"/>
						</a>
					}
					{entry && !isNew(entry) && isEntry &&
						<Icon icon="delete" key="header-delete" onclick={() => showConfirmDeleteEntryModal({ entry })} class="fade-up" role="button" aria-label="Delete entry"/>
					}
					{isEntry && navigator.share &&
						<Icon icon="share" key="header-share" onclick={() => navigator.share({ text: entry.date + ' ' + entry.text })} class="fade-up" role="button" aria-label="Share entry"/>
					}
					{entry && !isNew(entry) && isEntry &&
						<Icon icon={favoriteIcon} onclick={() => toggleFavorite({ id: entry.id, favorited: !entry.favorited })} class="fade-up" role="button" aria-label="Toggle favorite"/>
					}
				</div>

				<div class="nav-set">
					<Icon icon="menu" key="header-menu" onclick={() => { app.dialogMode = 'menu'; }} class="fade-down" role="button" aria-label="Menu"/>
				</div>

				{view === '/entries' &&
					<div class="button--fab add-entry elevated grow">
						<a href="/entry/new" aria-label="New entry">
							<Icon icon="clear" key="header-add" class="rotate45"/>
						</a>
					</div>
				}
			</div>
		</header>
	);
}
