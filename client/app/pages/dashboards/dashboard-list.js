import { isString, extend } from 'lodash';

import { LivePaginator } from '@/lib/pagination';
import template from './dashboard-list.html';
import './dashboard-list.css';

function DashboardListCtrl($scope, currentUser, $location, Dashboard) {
  const page = parseInt($location.search().page || 1, 10);

  // use $parent because we're using a component as route target instead of controller;
  // $parent refers to scope created for the page by router
  this.resource = $scope.$parent.$resolve.resource;
  this.currentPage = $scope.$parent.$resolve.currentPage;

  this.defaultOptions = {};

  this.searchText = $location.search().q;

  this.currentUser = currentUser;

  this.selectedTags = new Set();
  this.onTagsUpdate = (tags) => {
    this.selectedTags = tags;
    this.update();
  };

  this.showEmptyState = false;
  this.loaded = false;

  const fetcher = (requestedPage, itemsPerPage, paginator) => {
    $location.search('page', requestedPage);

    const request = Object.assign({}, this.defaultOptions, {
      page: requestedPage,
      page_size: itemsPerPage,
      tags: [...this.selectedTags], // convert Set to Array
    });

    if (isString(this.searchText) && this.searchText !== '') {
      request.q = this.searchText;
    }

    this.loaded = false;
    return this.resource(request).$promise.then((data) => {
      this.loaded = true;
      const rows = data.results.map(d => new Dashboard(d));
      paginator.updateRows(rows, data.count);
      this.showEmptyState = data.count === 0;
    });
  };

  this.paginator = new LivePaginator(fetcher, { page });

  this.navigateTo = ($event, url) => {
    if ($event.altKey || $event.ctrlKey || $event.metaKey || $event.shiftKey) {
      // keep default browser behavior
      return;
    }
    $event.preventDefault();
    $location.url(url);
  };

  this.update = () => {
    // trigger paginator refresh
    this.paginator.setPage(1);
  };
}

export default function init(ngModule) {
  ngModule.component('pageDashboardList', {
    template,
    controller: DashboardListCtrl,
  });

  const route = {
    template: '<page-dashboard-list></page-dashboard-list>',
    reloadOnSearch: false,
  };

  return {
    '/dashboards': extend(
      {
        title: 'Dashboards',
        resolve: {
          currentPage: () => 'all',
          resource(Dashboard) {
            'ngInject';

            return Dashboard.query.bind(Dashboard);
          },
        },
      },
      route,
    ),
    '/dashboards/favorites': extend(
      {
        title: 'Favorite Dashboards',
        resolve: {
          currentPage: () => 'favorites',
          resource(Dashboard) {
            'ngInject';

            return Dashboard.favorites.bind(Dashboard);
          },
        },
      },
      route,
    ),
  };
}
