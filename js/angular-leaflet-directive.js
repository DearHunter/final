var leafletDirective = angular.module("leaflet-directive", []);

leafletDirective.directive("leaflet", ["$http", "$log", function ($http, $log) {

    var defaults = {
        maxZoom: 11,
        tileLayer: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',

        icon: {
            url: 'http://cdn.leafletjs.com/leaflet-0.5.1/images/marker-icon.png',
            retinaUrl: 'http://cdn.leafletjs.com/leaflet-0.5.1/images/marker-icon@2x.png',
            size: [25, 41],
            anchor: [12, 40],
            popup: [0, -40],
            shadow: {
                url: 'http://cdn.leafletjs.com/leaflet-0.5.1/images/marker-shadow.png',
                retinaUrl: 'http://cdn.leafletjs.com/leaflet-0.5.1/images/marker-shadow.png',
                size: [41, 41],
                anchor: [12, 40]
            }
        },
        path: {
            weight: 10,
            opacity: 1
        }
    };

    var center = {

    };

    return {
        restrict: "E",
        replace: true,
        transclude: true,
        scope: {
            center: '=center',
            markers: '=markers',
            defaults: '=defaults',
            path: '=path'
        },
        template: '<div class="angular-leaflet-map"></div>',
        link: function ($scope, element, attrs /*, ctrl */) {
            // added zoomControl: false
            // took var out to make it a global varible, that way my existing markers logic works!
            map = new L.Map(element[0], {zoomControl: false, attributionControl:true});
            map.setView([0, 0], 1);

            $scope.leaflet = {};
            $scope.leaflet.map = !!attrs.testing ? map : 'Add testing="testing" to <leaflet> tag to inspect this object';
            $scope.leaflet.maxZoom = !!(attrs.defaults && $scope.defaults.maxZoom) ? parseInt($scope.defaults.maxZoom, 10) : defaults.maxZoom;
            $scope.leaflet.minZoom = !!(attrs.defaults && $scope.defaults.minZoom) ? parseInt($scope.defaults.minZoom, 10) : defaults.minZoom;
            $scope.leaflet.key = !!(attrs.defaults && $scope.defaults.key) ? $scope.defaults.key : defaults.key;
            $scope.leaflet.style = !!(attrs.defaults && $scope.defaults.style) ? $scope.defaults.style : defaults.style;
            $scope.leaflet.attribution = !!(attrs.defaults && $scope.defaults.attribution) ? $scope.defaults.attribution : defaults.attribution;
            $scope.leaflet.tileLayer = !!(attrs.defaults && $scope.defaults.tileLayer) ? $scope.defaults.tileLayer : defaults.tileLayer;
            L.tileLayer($scope.leaflet.tileLayer, {key: $scope.leaflet.key, maxZoom: $scope.leaflet.maxZoom, minZoom: $scope.leaflet.minZoom, style: $scope.leaflet.style, attribution: $scope.leaflet.attribution }).addTo(map);

            // This adds the zoom control back with bottomleft position
            map.addControl(L.control.zoom({position: "bottomleft"}));
            L.control.locate({
                position: "bottomleft",
                'setView': false
                }).addTo(map);

            setupCenter();
            setupMarkers();
            setupPath();

            function setupCenter() {
                if (!$scope.center) {
                    return;
                }

                if ($scope.center.lat && $scope.center.lng && $scope.center.zoom) {
                    map.setView([$scope.center.lat, $scope.center.lng], $scope.center.zoom);
                } else if ($scope.center.autoDiscover === true) {
                    map.locate({ setView: true, maxZoom: $scope.leaflet.maxZoom });
                }

                map.on("dragend", function (/* event */) {
                    $scope.$apply(function (scope) {
                        scope.center.lat = map.getCenter().lat;
                        scope.center.lng = map.getCenter().lng;
                    });
                });

                map.on("zoomend", function (/* event */) {
                    if ($scope.center.zoom !== map.getZoom()) {
                        $scope.$apply(function (s) {
                            s.center.zoom = map.getZoom();
                        });
                    }
                });

                $scope.$watch("center", function (center /*, oldValue */) {
                    if (center.lat && center.lng && center.zoom) {
                        map.setView([center.lat, center.lng], center.zoom);
                    }
                }, true);
            }

            function setupMarkers() {
                var markers = {};
                $scope.leaflet.markers = !!attrs.testing ? markers : 'Add testing="testing" to <leaflet> tag to inspect this object';

                if (!$scope.markers) {
                    return;
                }

                for (var name in $scope.markers) {
                    markers[name] = createMarker(name, $scope.markers[name], map);
                }

                $scope.$watch("markers", function (newMarkers /*, oldMarkers*/) {
                    for (var new_name in newMarkers) {
                        if (markers[new_name] === undefined) {
                            markers[new_name] = createMarker(new_name, newMarkers[new_name], map);
                        }
                    }

                    // Delete markers from the array
                    for (var name in markers) {
                        if (newMarkers[name] === undefined) {
                            delete markers[name];
                        }
                    }

                }, true);
            }

            function createMarker(name, scopeMarker, map) {
                var marker = buildMarker(name, scopeMarker);
                map.addLayer(marker);

                if (scopeMarker.focus === true) {
                    marker.openPopup();
                }

                marker.on("dragend", function () {
                    $scope.$apply(function (scope) {
                        scopeMarker.lat = marker.getLatLng().lat;
                        scopeMarker.lng = marker.getLatLng().lng;
                    });
                    if (scopeMarker.message) {
                        marker.openPopup();
                    }
                });

                $scope.$watch('markers.' + name, function (data, oldData) {
                    if (!data) {
                        map.removeLayer(marker);
                        return;
                    }

                    if (oldData) {
                        if (data.draggable !== undefined && data.draggable !== oldData.draggable) {
                            if (data.draggable === true) {
                                marker.dragging.enable();
                            } else {
                                marker.dragging.disable();
                            }
                        }

                        if (data.focus !== undefined && data.focus !== oldData.focus) {
                            if (data.focus === true) {
                                marker.openPopup();
                            } else {
                                marker.closePopup();
                            }
                        }

                        if (data.message !== undefined && data.message !== oldData.message) {
                            marker.bindPopup(data);
                        }

                        if (data.lat !== oldData.lat || data.lng !== oldData.lng) {
                            marker.setLatLng(new L.LatLng(data.lat, data.lng));
                        }
                    }
                }, true);
return marker;
}

function buildMarker(name, data) {
    var marker = new L.marker($scope.markers[name],
    {
        icon: buildIcon(),
        draggable: data.draggable ? true : false
    }
    );
    if (data.message) {
        marker.bindPopup(data.message);
    }
    return marker;
}

function buildIcon() {
    return L.icon({
        iconUrl: defaults.icon.url,
        iconRetinaUrl: defaults.icon.retinaUrl,
        iconSize: defaults.icon.size,
        iconAnchor: defaults.icon.anchor,
        popupAnchor: defaults.icon.popup,
        shadowUrl: defaults.icon.shadow.url,
        shadowRetinaUrl: defaults.icon.shadow.retinaUrl,
        shadowSize: defaults.icon.shadow.size,
        shadowAnchor: defaults.icon.shadow.anchor
    });
}

function setupPath() {
                // TODO Create as many polylines as paths defined in model
                // TODO Manage opacity changes with another $watch block
                if (!$scope.path) {
                    return;
                }

                $log.warn("[AngularJS - Leaflet] Creating polylines and adding them to the map will break the directive's scope's inspection in AngularJS Batarang");

                var polyline = new L.Polyline([], { weight: defaults.path.weight, opacity: defaults.path.opacity});
                $scope.leaflet.path = !!attrs.testing ? polyline : 'Add testing="testing" to <leaflet> tag to inspect this object';

                map.addLayer(polyline);

                $scope.$watch("path.latlngs", function (latlngs) {
                    var leafletLatLngs = latlngs
                    .filter(function (latlng) {
                        return !!latlng.lat && !!latlng.lng;
                    })
                    .map(function (latlng) {
                        return new L.LatLng(latlng.lat, latlng.lng);
                    });
                    polyline.setLatLngs(leafletLatLngs);
                }, true);

                $scope.$watch("path.weight", function (weight) {
                    polyline.setStyle({ weight: weight });
                }, true);

                $scope.$watch("path.color", function (color) {
                    polyline.setStyle({ color: color });
                }, true);
            }
        }
    };
}]);
