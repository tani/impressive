;;; ox-impressive.el --- Export Org files to impressive.js  -*- lexical-binding: t; -*-

;; SPDX-License-Identifier: 0BSD
;;
;; Permission to use, copy, modify, and/or distribute this software for any
;; purpose with or without fee is hereby granted.
;;
;; THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
;; WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
;; MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
;; SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
;; WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
;; OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
;; CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

;; Author: Tani
;; Keywords: outlines, hypermedia, presentations
;; Package-Requires: ((emacs "28.1") (org "9.6"))

;;; Commentary:

;; This package defines an Org export backend derived from `html'.  Each
;; top-level headline becomes an impressive.js slide.  Slide geometry is read
;; from a property drawer:
;;
;;   * A slide
;;     :PROPERTIES:
;;     :IMPRESSIVE_X: 1400
;;     :IMPRESSIVE_Y: 200
;;     :IMPRESSIVE_ROTATE_Y: 20
;;     :IMPRESSIVE_SCALE: 0.9
;;     :END:
;;
;; Set IMPRESSIVE_OVERVIEW to a non-nil value on a top-level headline to emit
;; an overview marker instead of a slide.  Use `org-impressive-export-to-html'
;; or the Org export dispatcher to export the current document.

;;; Code:

(require 'ox-html)
(require 'seq)
(require 'subr-x)

(defgroup org-export-impressive nil
  "Options for exporting Org files to impressive.js."
  :tag "Org Export Impressive"
  :group 'org-export)

(defconst org-impressive--library-directory
  (file-name-directory
   (or load-file-name
       (locate-library "ox-impressive")
       buffer-file-name
       default-directory))
  "Directory containing the loaded Org impressive exporter.")

(defcustom org-impressive-css "impressive.css"
  "File containing the structural impressive.js stylesheet."
  :group 'org-export-impressive
  :type 'string)

(defcustom org-impressive-theme "impressive-academia-light.css"
  "File containing the optional impressive.js theme stylesheet.

Set this to nil or an empty string to export without a theme."
  :group 'org-export-impressive
  :type '(choice (const :tag "No theme" nil) string))

(defcustom org-impressive-script "impressive.js"
  "File containing the impressive.js script."
  :group 'org-export-impressive
  :type 'string)

(defcustom org-impressive-controls t
  "Non-nil means include previous and next buttons in exported files."
  :group 'org-export-impressive
  :type 'boolean)

(defconst org-impressive--geometry-properties
  '((:IMPRESSIVE_X . "x")
    (:IMPRESSIVE_Y . "y")
    (:IMPRESSIVE_Z . "z")
    (:IMPRESSIVE_ROTATE . "rotate")
    (:IMPRESSIVE_ROTATE_X . "rotate-x")
    (:IMPRESSIVE_ROTATE_Y . "rotate-y")
    (:IMPRESSIVE_ROTATE_Z . "rotate-z")
    (:IMPRESSIVE_SCALE . "scale"))
  "Org properties and their corresponding impressive.js data attributes.")

(defun org-impressive--html-attribute-value (value)
  "Escape VALUE for use in an HTML attribute."
  (replace-regexp-in-string
   "\"" "&quot;" (org-html-encode-plain-text (format "%s" value)) t t))

(defun org-impressive--enabled-p (value)
  "Return non-nil when VALUE represents an enabled option."
  (and value
       (not (member (downcase (string-trim (format "%s" value)))
                    '("" "0" "false" "nil" "no" "off")))))

(defun org-impressive--numeric-property (headline property)
  "Return numeric PROPERTY from HEADLINE, or nil when it is absent.

Signal an error when the property exists but is not a plain number."
  (when-let* ((raw (org-element-property property headline)))
    (let ((value (string-trim raw)))
      (unless (string-match-p
               "\\`[+-]?\\(?:[0-9]+\\(?:\\.[0-9]*\\)?\\|\\.[0-9]+\\)\\'"
               value)
        (user-error "%s must be numeric on headline: %s"
                    (substring (symbol-name property) 1)
                    (org-element-property :raw-value headline)))
      value)))

(defun org-impressive--geometry-attributes (headline)
  "Return impressive.js data attributes for HEADLINE."
  (mapconcat
   (lambda (entry)
     (when-let* ((value
                  (org-impressive--numeric-property headline (car entry))))
       (format " data-%s=\"%s\"" (cdr entry) value)))
   org-impressive--geometry-properties
   ""))

(defun org-impressive--headline-id (headline info)
  "Return the HTML identifier for HEADLINE using export INFO."
  (org-impressive--html-attribute-value (org-html--reference headline info)))

(defun org-impressive-headline (headline contents info)
  "Transcode HEADLINE and CONTENTS using export INFO.

Top-level headlines become slides.  Deeper headlines are delegated to the
standard HTML exporter."
  (if (/= (org-export-get-relative-level headline info) 1)
      (org-html-headline headline contents info)
    (let* ((id (org-impressive--headline-id headline info))
           (overview
            (org-impressive--enabled-p
             (org-element-property :IMPRESSIVE_OVERVIEW headline))))
      (if overview
          (format "<div id=\"%s\" class=\"overview\"></div>" id)
        (let* ((title
                (org-export-data (org-element-property :title headline) info))
               (extra-class (org-element-property :IMPRESSIVE_CLASS headline))
               (class
                (if (and extra-class (not (string-empty-p extra-class)))
                    (format "step %s"
                            (org-impressive--html-attribute-value extra-class))
                  "step")))
          (format
           "<section id=\"%s\" class=\"%s\"%s>\n<h1>%s</h1>\n%s</section>"
           id class (org-impressive--geometry-attributes headline)
           title (or contents "")))))))

(defun org-impressive--asset-file (path info)
  "Resolve asset PATH using export INFO.

Relative paths are resolved against the Org input file first, then against
the directory containing this exporter."
  (when (and path (not (string-empty-p path)))
    (let* ((input-file (plist-get info :input-file))
           (input-directory
            (and input-file (file-name-directory input-file)))
           (candidates
            (if (file-name-absolute-p path)
                (list path)
              (delete-dups
               (delq nil
                     (list
                      (and input-directory
                           (expand-file-name path input-directory))
                      (expand-file-name path org-impressive--library-directory)
                      (expand-file-name path default-directory))))))
           (file (seq-find #'file-readable-p candidates)))
      (unless file
        (user-error "Cannot read impressive.js asset: %s" path))
      file)))

(defun org-impressive--asset-content (path info)
  "Return the contents of asset PATH resolved using export INFO."
  (when-let* ((file (org-impressive--asset-file path info)))
    (with-temp-buffer
      (insert-file-contents file)
      (buffer-string))))

(defun org-impressive--style-element (path info)
  "Return an embedded style element for asset PATH using export INFO."
  (if-let* ((content (org-impressive--asset-content path info)))
      (let ((case-fold-search t))
        (format "<style>\n%s\n</style>\n"
                (replace-regexp-in-string
                 "</style" "<\\/style" content t t)))
    ""))

(defun org-impressive--script-element (path info)
  "Return an embedded script element for asset PATH using export INFO."
  (if-let* ((content (org-impressive--asset-content path info)))
      (let ((case-fold-search t))
        (format "<script>\n%s\n</script>\n"
                (replace-regexp-in-string
                 "</script" "<\\/script" content t t)))
    ""))

(defun org-impressive-template (contents info)
  "Return a complete impressive.js document for CONTENTS and export INFO."
  (let* ((language
          (org-impressive--html-attribute-value
           (or (plist-get info :language) "en")))
         (title-data (plist-get info :title))
         (title
          (if title-data
              (string-trim
               (org-html-plain-text
                (org-element-interpret-data title-data) info))
            "impressive.js presentation"))
         (css (plist-get info :impressive-css))
         (theme (plist-get info :impressive-theme))
         (script (plist-get info :impressive-script))
         (controls (plist-get info :impressive-controls)))
    (concat
     "<!doctype html>\n"
     (format "<html lang=\"%s\">\n<head>\n" language)
     "  <meta charset=\"utf-8\">\n"
     "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
     (format "  <title>%s</title>\n" title)
     (org-impressive--style-element css info)
     (org-impressive--style-element theme info)
     (org-impressive--script-element script info)
     "</head>\n<body>\n<div class=\"impressive\">\n"
     contents
     (when (org-impressive--enabled-p controls)
       (concat
        "<nav class=\"impressive-controls\" aria-label=\"Presentation controls\">\n"
        "  <button type=\"button\" data-prev aria-label=\"Previous slide\">←</button>\n"
        "  <button type=\"button\" data-next aria-label=\"Next slide\">→</button>\n"
        "</nav>\n"))
     "<div class=\"impressive-annotations\" role=\"toolbar\" aria-label=\"Slide annotations\">\n"
     "  <button type=\"button\" data-annotation=\"off\" aria-pressed=\"true\">Pointer</button>\n"
     "  <button type=\"button\" data-annotation=\"pen\" aria-pressed=\"false\">Pen</button>\n"
     "  <button type=\"button\" data-annotation=\"eraser\" aria-pressed=\"false\">Eraser</button>\n"
     "  <button type=\"button\" data-annotation=\"clear\">Clear</button>\n"
     "</div>\n"
     "</div>\n</body>\n</html>\n")))

;;;###autoload
(org-export-define-derived-backend 'impressive 'html
  :menu-entry
  '(?I "Export to impressive.js"
       ((?H "To temporary buffer" org-impressive-export-as-html)
        (?h "To HTML file" org-impressive-export-to-html)
        (?o "To HTML file and open"
            (lambda (async subtreep visible-only body-only)
              (if async
                  (org-impressive-export-to-html
                   t subtreep visible-only body-only)
                (org-open-file
                 (org-impressive-export-to-html
                  nil subtreep visible-only body-only)))))))
  :options-alist
  '((:with-toc nil "toc" nil)
    (:section-numbers nil "num" nil)
    (:html-toplevel-hlevel nil nil 1)
    (:impressive-css "IMPRESSIVE_CSS" nil org-impressive-css t)
    (:impressive-theme "IMPRESSIVE_THEME" nil org-impressive-theme t)
    (:impressive-script "IMPRESSIVE_SCRIPT" nil org-impressive-script t)
    (:impressive-controls "IMPRESSIVE_CONTROLS" nil org-impressive-controls))
  :translate-alist
  '((headline . org-impressive-headline)
    (template . org-impressive-template)))

;;;###autoload
(defun org-impressive-export-as-html
    (&optional async subtreep visible-only body-only ext-plist)
  "Export the current Org buffer to a temporary impressive.js HTML buffer.

ASYNC, SUBTREEP, VISIBLE-ONLY, BODY-ONLY, and EXT-PLIST are passed to
`org-export-to-buffer'."
  (interactive)
  (org-export-to-buffer
      'impressive "*Org Impressive Export*"
    async subtreep visible-only body-only ext-plist
    (lambda () (html-mode))))

;;;###autoload
(defun org-impressive-export-to-html
    (&optional async subtreep visible-only body-only ext-plist)
  "Export the current Org buffer to an impressive.js HTML file.

ASYNC, SUBTREEP, VISIBLE-ONLY, BODY-ONLY, and EXT-PLIST are passed to
`org-export-to-file'."
  (interactive)
  (let ((file (org-export-output-file-name ".html" subtreep)))
    (org-export-to-file
        'impressive file
      async subtreep visible-only body-only ext-plist)))

(provide 'ox-impressive)

;;; ox-impressive.el ends here
