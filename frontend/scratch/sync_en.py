import os
import re

# Source and target directories
src_dir = r"c:\Users\virgi\Desktop\REBRANDING PLAYA\frontend"
en_dir = os.path.join(src_dir, "en")

# Pages to sync
pages = ['index.html', 'beach.html', 'eventi.html', 'contatti.html', 'network.html', 'ristorante.html']

# Translation map for IT->EN content
translations = {
    # Common
    'Spiaggia': 'Beach',
    'Ristorante': 'Restaurant', 
    'Eventi': 'Events',
    'Contatti': 'Contact',
    'Scopri di più': 'Discover More',
    'Prenota Tavolo': 'Reserve Table',
    'Vedi Menu': 'View Menu',
    'Richiedi Disponibilità': 'Check Availability',
    'Scopri gli Eventi': 'Discover Events',
    'Invia Richiesta': 'Send Request',
    'Parla con l\'Event Planner': 'Speak with our Event Planner',
    
    # Index page
    'L\'Esclusività ha un nuovo Orizzonte': 'Exclusivity Has a New Horizon',
    'Vivi l\'Emozione <br>della Costa': 'Experience the Emotion <br>of the Coast',
    'Gourmet Experience': 'Gourmet Experience',
    'Pure Relaxation': 'Pure Relaxation',
    'Private Celebrations': 'Private Celebrations',
    'Il Ristorante': 'The Restaurant',
    'La Spiaggia': 'The Beach',
    'Gli Eventi': 'The Events',
    'Follow the lifestyle': 'Follow the lifestyle',
    'Vedi su Instagram': 'View on Instagram',
    'Privacy Policy': 'Privacy Policy',
    'Lavora con noi': 'Work with us',
    'Richiedi un preventivo': 'Request a quote',
    'Pranzo: Tutti i giorni (tutto l\'anno) | Sera: Eventi Privati': 'Lunch: Daily (all year) | Evening: Private Events',
    
    # Ristorante
    'Fine Dining Experience': 'Fine Dining Experience',
    'L\'Arte del Gusto': 'The Art of Taste',
    '"La cucina è l\'emozione del mare trasformata in sapore, un rito che si rinnova ogni giorno sotto il sole di Varcaturo."': '"Cuisine is the emotion of the sea transformed into flavor, a ritual renewed every day under the Varcaturo sun."',
    '— La Nostra Filosofia': '— Our Philosophy',
    'Un Pranzo Vista Mare': 'A Seaside Lunch',
    'Il Ristorante Playa Luna è aperto tutti i giorni a pranzo, tutto l\'anno. Una cucina mediterranea autentica, dove il pescato del giorno è il protagonista assoluto, servito in un ambiente raffinato ed elegante.': 'Playa Luna Restaurant is open daily for lunch, all year round. Authentic Mediterranean cuisine where the daily catch takes center stage, served in a refined and elegant setting.',
    'Sera: Location Esclusiva per Eventi Privati': 'Evening: Exclusive Venue for Private Events',
    'Vorrei%20prenotare%20un%20tavolo%20per%20pranzo': 'I%20would%20like%20to%20reserve%20a%20table%20for%20lunch',
    'Sospesi tra cielo e mare': 'Suspended between sky and sea',
    'La Terrazza': 'The Terrace',
    'L\'area più esclusiva del nostro ristorante. Una terrazza panoramica dove la brezza marina accompagna ogni portata, creando un\'atmosfera magica e senza tempo per i tuoi momenti speciali.': 'The most exclusive area of our restaurant. A panoramic terrace where the sea breeze accompanies every course, creating a magical and timeless atmosphere for your special moments.',
    'Pranzo: 12:30 - 16:30 | Sera: Solo Eventi Privati': 'Lunch: 12:30 - 16:30 | Evening: Private Events Only',
    
    # Beach
    'Exclusive Beach Club': 'Exclusive Beach Club',
    'Relax &amp; Orizzonte': 'Relax &amp; Horizon',
    'Relax & Orizzonte': 'Relax & Horizon',
    'Vivi l\'esperienza': 'Live the experience',
    'Servizi Su Misura': 'Tailored Services',
    'Spiaggia Luxury': 'Luxury Beach',
    'Lettini oversize e postazioni distanziate per il massimo della privacy.': 'Oversized sunbeds and spaced-out stations for maximum privacy.',
    'Beach Bar': 'Beach Bar',
    'Cocktail d\'autore e drink rinfrescanti serviti direttamente sotto l\'ombrellone.': 'Craft cocktails and refreshing drinks served right to your sunbed.',
    'Cabanas Private': 'Private Cabanas',
    'Suite sulla sabbia per una giornata di mare in totale esclusività.': 'Sand suites for an exclusive day by the sea.',
    'Valet Parking': 'Valet Parking',
    'Arriva senza pensieri: il nostro team si occuperà della tua auto.': 'Arrive worry-free: our team will take care of your car.',
    'Vorrei%20richiedere%20disponibilit%C3%A0%20per%20un%20ombrellone': 'I%20would%20like%20to%20check%20availability%20for%20a%20sunbed',
    'Postazioni limitate, si consiglia la prenotazione anticipata': 'Limited spots, advance booking recommended',
    'The Golden Hour': 'The Golden Hour',
    'Il Rito del Tramonto': 'The Sunset Ritual',
    'Quando il sole incontra il mare di Varcaturo, Playa Luna si trasforma. Un\'atmosfera magica dove musica e relax si fondono in un\'esperienza sensoriale indimenticabile.': 'When the sun meets the sea of Varcaturo, Playa Luna transforms. A magical atmosphere where music and relaxation blend into an unforgettable sensory experience.',
    
    # Eventi
    'Momenti Indimenticabili': 'Unforgettable Moments',
    'Cornici da Sogno<br>per i Tuoi Momenti': 'Dream Frames<br>for Your Moments',
    'Il Nostro Metodo': 'Our Method',
    'Dall\'Idea alla Perfezione': 'From Idea to Perfection',
    'Vision': 'Vision',
    'Ascoltiamo la tua idea e ti guidiamo nella scelta della location, dello stile e dell\'atmosfera perfetta per il tuo evento.': 'We listen to your idea and guide you in choosing the perfect venue, style, and atmosphere for your event.',
    'Planning': 'Planning',
    'Il nostro team di event planner costruisce ogni dettaglio: catering, allestimenti, intrattenimento e logistica.': 'Our team of event planners builds every detail: catering, decorations, entertainment, and logistics.',
    'Perfection': 'Perfection',
    'Il giorno dell\'evento, ci pensiamo noi. Tu ti godi ogni istante, noi ci occupiamo di rendere tutto impeccabile.': 'On the day of the event, we handle everything. You enjoy every moment, we make sure it\'s flawless.',
    'Le Nostre Specialità': 'Our Specialties',
    'Ogni Evento è Unico': 'Every Event is Unique',
    'Beach Wedding': 'Beach Wedding',
    'Il sogno di un matrimonio sulla spiaggia di Varcaturo diventa realtà.': 'The dream of a beach wedding in Varcaturo becomes reality.',
    'Private Party': 'Private Party',
    'Compleanni, anniversari e feste private curate in ogni dettaglio.': 'Birthdays, anniversaries, and private parties curated in every detail.',
    'Corporate Events': 'Corporate Events',
    'Presentazioni aziendali, team building e cene di gala.': 'Business presentations, team building, and gala dinners.',
    'Domande Frequenti': 'Frequently Asked Questions',
    'Quanti ospiti posso invitare?': 'How many guests can I invite?',
    'La nostra location può ospitare da 30 a 300 persone, a seconda della tipologia di evento e dell\'allestimento scelto. Contattateci per un preventivo personalizzato.': 'Our venue can host from 30 to 300 guests, depending on the event type and setup. Contact us for a personalized quote.',
    'È disponibile il parcheggio?': 'Is parking available?',
    'Sì, disponiamo di un ampio parcheggio privato e offriamo servizio di valet parking per i vostri ospiti.': 'Yes, we have a spacious private parking lot and offer valet parking service for your guests.',
    'Cosa succede in caso di pioggia?': 'What happens in case of rain?',
    'Disponiamo di aree coperte e soluzioni alternative per ogni evenienza meteorologica. Il vostro evento sarà perfetto con qualsiasi condizione.': 'We have covered areas and alternative solutions for any weather conditions. Your event will be perfect regardless.',
    'Posso personalizzare il menu?': 'Can I customize the menu?',
    'Assolutamente sì. Il nostro chef creerà un menu su misura per il vostro evento, tenendo conto di gusti, allergie e preferenze specifiche.': 'Absolutely. Our chef will create a custom menu for your event, taking into account tastes, allergies, and specific preferences.',
    'Raccontaci la tua Idea': 'Tell Us Your Idea',
    'Siamo pronti a trasformare la tua visione in un evento indimenticabile. Compila il modulo o contattaci direttamente su WhatsApp per una consulenza personalizzata.': 'We\'re ready to transform your vision into an unforgettable event. Fill out the form or contact us directly on WhatsApp for a personalized consultation.',
    'Vorrei%20informazioni%20per%20organizzare%20un%20evento': 'I%20would%20like%20information%20about%20organizing%20an%20event',
    'Nome e Cognome': 'Full Name',
    'Il tuo nome': 'Your name',
    'Tipo di Evento': 'Event Type',
    'Matrimonio': 'Wedding',
    'Festa Privata': 'Private Party',
    'Evento Aziendale': 'Corporate Event',
    'Altro': 'Other',
    'Data dell\'Evento': 'Event Date',
    'Messaggio': 'Message',
    'Descrivici il tuo evento...': 'Describe your event...',
    
    # Contatti
    'Siamo qui per te': 'We\'re here for you',
    'Inizia la tua Estate': 'Start Your Summer',
    'Scegli il reparto dedicato per ricevere assistenza immediata o vieni a trovarci a Varcaturo.': 'Choose the dedicated department for immediate assistance or visit us in Varcaturo.',
    'Prenota il tuo tavolo per un pranzo gourmet vista mare.': 'Reserve your table for a gourmet seaside lunch.',
    'WhatsApp Ristorante': 'WhatsApp Restaurant',
    'Richiedi disponibilità per ombrelloni, cabanas o lettini.': 'Check availability for umbrellas, cabanas, or sunbeds.',
    'WhatsApp Spiaggia': 'WhatsApp Beach',
    'Organizza il tuo evento esclusivo con il nostro team.': 'Organize your exclusive event with our team.',
    'WhatsApp Eventi': 'WhatsApp Events',
    
    # Network
    'Network di Eccellenza': 'Excellence Network',
    'Le Nostre Destinazioni': 'Our Destinations',
    'Una collezione di location esclusive dove il lusso incontra la bellezza della costa. Ogni destinazione è garanzia di qualità e di esperienze indimenticabili.': 'A collection of exclusive venues where luxury meets the beauty of the coast. Each destination is a guarantee of quality and unforgettable experiences.',
    'Varca d\'Oro': 'Varca d\'Oro',
    'Lo storico stabilimento balneare che ha fatto la storia della costa. Tradizione e innovazione si incontrano per un\'estate senza tempo.': 'The historic beach club that shaped the coast\'s history. Tradition and innovation meet for a timeless summer.',
    'Scopri Varca d\'Oro →': 'Explore Varca d\'Oro →',
    'Il lato notturno dell\'eccellenza. Musica, stile e atmosfera si fondono in serate uniche. Il punto di riferimento per la nightlife sulla costa.': 'The nighttime side of excellence. Music, style, and atmosphere blend into unique evenings. The reference point for coastal nightlife.',
    'Scopri Culto →': 'Explore Culto →',
    'Naturale Beach Club': 'Naturale Beach Club',
    'Un beach club dal design eco-friendly dove natura e comfort convivono in armonia. L\'alternativa green sulla costa campana.': 'An eco-friendly beach club where nature and comfort coexist in harmony. The green alternative on the Campanian coast.',
    'Scopri Naturale →': 'Explore Naturale →',
    'Una location esclusiva per eventi privati immersa nella natura. L\'eleganza discreta di un angolo di paradiso dedicato ai momenti più speciali.': 'An exclusive private event venue surrounded by nature. The discreet elegance of a corner of paradise dedicated to the most special moments.',
    'Scopri Damai →': 'Explore Damai →',
    
    # Footer
    'Viale Sibilla, 20 - 80014 Varcaturo (NA)': 'Viale Sibilla, 20 - 80014 Varcaturo (NA)',
    'P.IVA 09146931218': 'VAT 09146931218',
}

for page in pages:
    src_path = os.path.join(src_dir, page)
    dest_path = os.path.join(en_dir, page)
    
    if not os.path.exists(src_path):
        print(f"SKIP {page} not found in IT, skipping")
        continue
    
    with open(src_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Change lang attribute
    content = content.replace('lang="it"', 'lang="en"')
    
    # 2. Fix asset paths (add ../)
    content = content.replace('href="assets/', 'href="../assets/')
    content = content.replace('src="assets/', 'src="../assets/')
    content = content.replace("url('assets/", "url('../assets/")
    
    # 3. Fix inter-page navigation (add correct paths)
    content = content.replace('href="index.html"', 'href="index.html"')  # stays same within en/
    content = content.replace('href="beach.html"', 'href="beach.html"')
    content = content.replace('href="ristorante.html"', 'href="ristorante.html"')
    content = content.replace('href="eventi.html"', 'href="eventi.html"')
    content = content.replace('href="contatti.html"', 'href="contatti.html"')
    content = content.replace('href="network.html"', 'href="network.html"')
    content = content.replace('href="privacy-policy.html"', 'href="privacy-policy.html"')
    
    # 4. Fix language switcher
    # For EN pages: IT link should go to parent directory, EN link should be active
    content = content.replace(
        '<a href="en/index.html">EN</a> | <a href="#" class="active">IT</a>',
        '<a href="#" class="active">EN</a> | <a href="../index.html">IT</a>'
    )
    content = content.replace(
        '<a href="en/beach.html">EN</a> | <a href="#" class="active">IT</a>',
        '<a href="#" class="active">EN</a> | <a href="../beach.html">IT</a>'
    )
    content = content.replace(
        '<a href="en/ristorante.html">EN</a> | <a href="#" class="active">IT</a>',
        '<a href="#" class="active">EN</a> | <a href="../ristorante.html">IT</a>'
    )
    content = content.replace(
        '<a href="en/eventi.html">EN</a> | <a href="#" class="active">IT</a>',
        '<a href="#" class="active">EN</a> | <a href="../eventi.html">IT</a>'
    )
    content = content.replace(
        '<a href="en/contatti.html">EN</a> | <a href="#" class="active">IT</a>',
        '<a href="#" class="active">EN</a> | <a href="../contatti.html">IT</a>'
    )
    content = content.replace(
        '<a href="en/network.html">EN</a> | <a href="#" class="active">IT</a>',
        '<a href="#" class="active">EN</a> | <a href="../network.html">IT</a>'
    )
    # Also fix inline-style switchers
    content = content.replace(
        'href="en/contatti.html" style="text-decoration:none; color:inherit;">EN</a> | <a href="#" style="text-decoration:none; color:inherit; font-weight:600;">IT</a>',
        'href="#" style="text-decoration:none; color:inherit; font-weight:600;">EN</a> | <a href="../contatti.html" style="text-decoration:none; color:inherit;">IT</a>'
    )
    content = content.replace(
        'href="en/beach.html" style="text-decoration:none; color:inherit;">EN</a> | <a href="#" style="text-decoration:none; color:inherit; font-weight:600;">IT</a>',
        'href="#" style="text-decoration:none; color:inherit; font-weight:600;">EN</a> | <a href="../beach.html" style="text-decoration:none; color:inherit;">IT</a>'
    )
    content = content.replace(
        'href="en/ristorante.html" style="text-decoration:none; color:inherit;">EN</a> | <a href="#" style="text-decoration:none; color:inherit; font-weight:600;">IT</a>',
        'href="#" style="text-decoration:none; color:inherit; font-weight:600;">EN</a> | <a href="../ristorante.html" style="text-decoration:none; color:inherit;">IT</a>'
    )
    # Also fix network page
    content = content.replace(
        'href="en/network.html" style="text-decoration:none; color:inherit;">EN</a> | <a href="#" style="text-decoration:none; color:inherit; font-weight:600;">IT</a>',
        'href="#" style="text-decoration:none; color:inherit; font-weight:600;">EN</a> | <a href="../network.html" style="text-decoration:none; color:inherit;">IT</a>'
    )
    
    # 5. Apply translations
    for it_text, en_text in sorted(translations.items(), key=lambda x: len(x[0]), reverse=True):
        content = content.replace(it_text, en_text)
    
    # Write
    with open(dest_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"OK {page} -> en/{page}")

print("\nAll EN pages synced successfully!")
