#!/usr/bin/env python3
"""Read the private Collections worksheet into a CSV for the existing pipeline.

Credentials are supplied by GitHub Actions Workload Identity Federation.
No service-account key is downloaded or stored in the repository.
"""
import argparse
import csv
import os
from pathlib import Path

EXPECTED_HEADERS = ['Date', 'Material', 'Weight (kg)']
SCOPE = ['https://www.googleapis.com/auth/spreadsheets.readonly']


def sheet_rows_to_csv(rows, destination):
    if not rows or rows[0] != EXPECTED_HEADERS:
        raise ValueError(f'Unexpected Collections headers: {rows[0] if rows else None!r}; expected {EXPECTED_HEADERS!r}')
    data = []
    for row_number, values in enumerate(rows[1:], start=2):
        if not any(str(v).strip() for v in values):
            continue
        if len(values) != 3 or not all(str(v).strip() for v in values):
            raise ValueError(f'Sheet row {row_number}: expected three nonempty cells, found {values!r}')
        data.append([str(v).strip() for v in values])
    if not data:
        raise ValueError('Collections sheet contains no data rows')
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open('w', encoding='utf-8', newline='') as handle:
        writer = csv.writer(handle)
        writer.writerow(EXPECTED_HEADERS)
        writer.writerows(data)
    return len(data)


def fetch(spreadsheet_id, destination):
    import google.auth
    from google.auth.transport.requests import AuthorizedSession
    credentials, _ = google.auth.default(scopes=SCOPE)
    session = AuthorizedSession(credentials)
    url = f'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/Collections%21A%3AC'
    response = session.get(url, params={'valueRenderOption': 'FORMATTED_VALUE'}, timeout=30)
    response.raise_for_status()
    return sheet_rows_to_csv(response.json().get('values', []), destination)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--spreadsheet-id', default=os.environ.get('GOOGLE_SHEET_ID'), required=False)
    parser.add_argument('--output', default='build/source/collections.csv')
    args = parser.parse_args()
    if not args.spreadsheet_id:
        parser.error('Provide --spreadsheet-id or GOOGLE_SHEET_ID')
    count = fetch(args.spreadsheet_id, args.output)
    print(f'Fetched {count} rows from Collections; saved to {args.output}')

if __name__ == '__main__':
    main()
