/**
 * Service pour récupérer et extraire le contenu de pages web
 */
import https from 'https';
import http from 'http';
import { URL } from 'url';

/**
 * Récupère le contenu HTML d'une URL
 * @param {string} url - L'URL à récupérer
 * @returns {Promise<string>} - Le contenu HTML brut
 */
async function fetchWebpage(url) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RecipeKeeperBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
        timeout: 10000
      };

      const req = protocol.request(options, (res) => {
        // Gérer les redirections
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          console.log(`Redirecting to: ${res.headers.location}`);
          return fetchWebpage(res.headers.location)
            .then(resolve)
            .catch(reject);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }

        let data = '';
        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve(data);
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Failed to fetch webpage: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();

    } catch (error) {
      reject(new Error(`Invalid URL: ${error.message}`));
    }
  });
}

/**
 * Extrait le texte principal d'un HTML en supprimant les balises et scripts
 * @param {string} html - Le contenu HTML
 * @returns {string} - Le texte extrait
 */
function extractTextFromHtml(html) {
  let text = html;

  // Supprimer les scripts et styles
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

  // Supprimer les commentaires HTML
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Remplacer les balises de bloc par des sauts de ligne
  text = text.replace(/<\/(div|p|br|li|tr|h[1-6])[^>]*>/gi, '\n');
  text = text.replace(/<(br|hr)[^>]*>/gi, '\n');

  // Supprimer toutes les balises HTML restantes
  text = text.replace(/<[^>]+>/g, ' ');

  // Décoder les entités HTML courantes
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&euro;/g, '€');

  // Nettoyer les espaces multiples et lignes vides
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.trim();

  return text;
}

/**
 * Récupère une page web et extrait son contenu texte
 * @param {string} url - L'URL à traiter
 * @returns {Promise<Object>} - {url, html, text}
 */
async function fetchAndExtractWebpage(url) {
  console.log(`Fetching webpage: ${url}`);

  try {
    const html = await fetchWebpage(url);
    const text = extractTextFromHtml(html);

    console.log(`Extracted ${text.length} characters from webpage`);

    return {
      url,
      html,
      text,
      contentLength: text.length
    };

  } catch (error) {
    console.error(`Error fetching webpage ${url}:`, error);
    throw error;
  }
}

/**
 * Valide une URL
 * @param {string} url - L'URL à valider
 * @returns {boolean}
 */
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export {
  fetchWebpage,
  extractTextFromHtml,
  fetchAndExtractWebpage,
  isValidUrl
};
