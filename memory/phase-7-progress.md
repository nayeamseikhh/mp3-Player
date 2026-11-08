Phase 7 status: IN_PROGRESS — Dashboard widget builder

**Implemented:**
- Widget registry with 8 widget types: stats, recentlyPlayed, recentlyAdded, favorites, quickPlaylists, mostPlayed, topArtists, collectionOverview
- Individual widget components (StatsWidget, RecentlyPlayedWidget, RecentlyAddedWidget, FavoritesWidget, QuickPlaylistsWidget, MostPlayedWidget, TopArtistsWidget, CollectionOverviewWidget)
- Dynamic Dashboard page that renders widgets from stored SQLite layout
- Widget components support config parameters (e.g., limit for lists)
- All widget components lazy-loaded for code splitting
- Build passes successfully

**Integration:**
- Dashboard page reads layout from SQLite database_layouts and dashboard_widgets tables
- Widget components use useLibraryStore for data, usePlayerStore for playback
- Each widget supports quick play and consistent UI patterns
- WidgetRegistry provides available widgets map and component lookup

**Database Tables Used:**
- dashboard_layouts: layout_json, is_default, name
- dashboard_widgets: widget_id, configuration_json, position, is_visible, layout_id

**Next steps:**
- Phase 8: Final polish, settings completion, ARM64 packaging, performance optimization
- Ensure all widgets properly restore state from database on app restart
- Test dashboard layout persistence across sessions