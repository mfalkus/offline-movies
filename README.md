# Offline Movies

This is a simple web page that reads a CSV from a published Google sheet
that contains a list of films, it then displays a grid of film posters
with a simple modal for each that contains further information about the film.

The idea is, if you have a large offline film collection catalogued in a spreadsheet,
this should be an easy way to browse what you've got.

## How to use the site

The URL for the site should be something like:

    https://example.com/#sheetId=GOOGLE_SHEET_ID&apikey=OMDB_API_KEY

Where `GOOGLE_SHEET_ID` is the long part of the published google sheet URL before the `/pub` path, e.g.

    2PACX-1vRg97nYGiOam8_NJBGDTnm1234567FOeEJ9MltgIC0Pv7vk3ypkPDsPPTGB-b3kXGQZ0GtRupQ9p

from

    https://docs.google.com/spreadsheets/d/e/2PACX-1vRg97nYGiOam8_NJBGDTnm1234567FOeEJ9MltgIC0Pv7vk3ypkPDsPPTGB-b3kXGQZ0GtRupQ9p/pub?gid=0&single=true&output=csv

An OMDB API key can be generated here: https://www.omdbapi.com/

There is a limit of 1k requests per day, but the site uses local cache to try
and avoid hitting this even with regular usage.

## CSV Setup

The columns of the google sheet should be:

    Film	Year	Media	Tags	Notes

Film (mandatory) is the name that will be searched in the OMDB API. It needs to be an exact
match, use the API explorer on the home page here if results aren't what you
expect: https://www.omdbapi.com/

Year (optional and often not required). If you need to disambiguate between
two versions this can be helpful. e.g. if you have both the original 1960
Ocean's Eleven plus the later George Clooney version, you'll need this to get
both results.

Media (optional) is shown once the image is clicked and the modal appears. It
defaults to DVD if not supplied.

Tags (optional) are used to group films. They appear in the bottom right
of the images and can be clicked for quick filtering. They are separated by
`; ` instead of `,` so we can keep the CSV parsing dead easy. Note the space as well.
There is one special case tag, 'Unwatched', which acts to put a border around
the image and also to order the results such that unwatched films appear first.

Notes (optional) are free form text that appears in the modal.
