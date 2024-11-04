function initSearch(searchJsonUrl, searchTemplate, noResultsMessage) {
    SimpleJekyllSearch({
        searchInput: document.getElementById('search-input'),
        resultsContainer: document.getElementById('search-results'),
        json: searchJsonUrl,
        searchResultTemplate: searchTemplate,
        noResultsText: noResultsMessage,
        templateMiddleware: function(prop, value, template) {
            if (prop === 'categories') {
                if (value === '') {
                    return `${value}`;
                } else {
                    return `<div class="me-sm-4"><i class="far fa-folder" fa-fw></i>${value}</div>`;
                }
            }

            if (prop === 'tags') {
                if (value === '') {
                    return `${value}`;
                } else {
                    return `<div><i class="fa fa-tag fa-fw"></i>${value}</div>`;
                }
            }

            if (prop === 'content') {
                const searchQuery = document.getElementById('search-input').value;
                return snippetExtractor(value, searchQuery, 100);
            }

            return value;
        }
    });
}

function snippetExtractor(content, keywords, contextLength = 100) {
    const index = content.toLowerCase().indexOf(keywords.toLowerCase());
    if (index === -1) {
        return content.slice(0, contextLength) + '...';
    }

    const start = Math.max(0, index - contextLength / 2);
    const end = Math.min(content.length, index + keywords.length + contextLength / 2);
    const result = content.slice(start, end).replace(new RegExp(`(${keywords})`, 'gi'), '<span class="search-highlight">$1</span>');

    return (start > 0 ? '...' : '') + result + (end < content.length ? '...' : '');
}