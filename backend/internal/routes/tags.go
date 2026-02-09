package routes

import (
	"net/http"

	"github.com/jagjeevanak/golang-server/internal/database"
)

// TagRoutes sets up tag-related routes
func TagRoutes(mux *http.ServeMux, dbQueries *database.Queries) {
	// GET /api/tags - List all tags with article counts
	mux.HandleFunc("GET /api/tags", func(w http.ResponseWriter, r *http.Request) {
		tags, err := dbQueries.ListTags(r.Context())
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to fetch tags")
			return
		}

		result := make([]map[string]interface{}, 0, len(tags))
		for _, t := range tags {
			result = append(result, map[string]interface{}{
				"id":            t.ID,
				"name":          t.Name,
				"article_count": t.ArticleCount,
			})
		}

		respondJSON(w, http.StatusOK, map[string]interface{}{
			"tags": result,
		})
	})

	// GET /api/tags/{name}/articles - Get articles by tag
	mux.HandleFunc("GET /api/tags/{name}/articles", func(w http.ResponseWriter, r *http.Request) {
		tagName := r.PathValue("name")
		if tagName == "" {
			respondError(w, http.StatusBadRequest, "Tag name is required")
			return
		}

		limit, offset := getPagination(r)

		articles, err := dbQueries.ListArticlesByTag(r.Context(), database.ListArticlesByTagParams{
			Lower:  tagName,
			Limit:  limit,
			Offset: offset,
		})
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to fetch articles")
			return
		}

		result := make([]map[string]interface{}, 0, len(articles))
		for _, a := range articles {
			tags, _ := dbQueries.GetArticleTags(r.Context(), a.ID)
			result = append(result, articleRowToResponse(a.ID, a.UserID, a.Title, a.Body, a.Summary,
				a.ThumbnailUrl, a.Status, a.PublishedAt, a.CreatedAt, a.UpdatedAt,
				a.AuthorUsername, a.AuthorName, a.AuthorAvatarUrl, a.TotalClaps, tags))
		}
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"articles": result,
			"count":    len(result),
		})
	})
}
