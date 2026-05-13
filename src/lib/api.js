import { supabase } from './supabase';

/**
 * Submits a report (Sighting or Clearance) with optional Voice Note
 */
export async function submitReport({ 
  count, 
  severity, 
  notes, 
  latitude, 
  longitude, 
  range,
  images = [], 
  voice,
  reportType = 'SIGHTING',
  isClear = false,
  damageDesc = '',
  casualties = 0,
  officerName = '',
  designation = '',
  teamMembers = '',
  bullCount = 0,
  makhnaCount = 0,
  maleGroupCount = 0,
  femaleGroupCount = 0,
  femaleCalfCount = 0,
  singleFemaleCount = 0,
  isDamageCaused = false,
  damageType = '',
  chaseStartTime = '',
  chaseResult = '',
  remarks = ''
}) {
  const uploadedUrls = [];
  let voiceUrl = null;
  
  // Handle Unlimited Image Uploads
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    if (image) {
      const fileExt = image.name?.split('.').pop() || 'jpg';
      const fileName = `img_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('evidence_photos').upload(fileName, image, {
        contentType: image.type || 'image/jpeg'
      });
      if (uploadError) throw new Error(`Image ${i+1} upload failed: ` + uploadError.message);
      const publicUrl = supabase.storage.from('evidence_photos').getPublicUrl(fileName).data.publicUrl;
      uploadedUrls.push(publicUrl);
    }
  }

  // Handle Voice Upload
  if (voice) {
    const fileName = `voice_${Date.now()}.webm`; 
    const { error: voiceError } = await supabase.storage.from('evidence_photos').upload(fileName, voice, {
      contentType: 'audio/webm'
    });
    if (voiceError) throw new Error('Voice upload failed: ' + voiceError.message);
    voiceUrl = supabase.storage.from('evidence_photos').getPublicUrl(fileName).data.publicUrl;
  }
  
  const { data, error } = await supabase
    .from('reports')
    .insert({
      user_id: null,
      elephant_count: count || 0,
      severity: severity || 'LOW',
      notes: notes,
      latitude: latitude,
      longitude: longitude,
      range: range,
      image_url: uploadedUrls[0] || null, 
      image_url_2: uploadedUrls[1] || null, 
      image_url_3: uploadedUrls[2] || null, 
      image_urls: uploadedUrls, 
      voice_url: voiceUrl,
      report_type: reportType,
      is_clear: isClear,
      damage_desc: damageDesc,
      casualties: casualties,
      officer_name: officerName,
      designation: designation,
      team_members: teamMembers,
      bull_count: bullCount,
      makhna_count: makhnaCount,
      male_group_count: maleGroupCount,
      female_group_count: femaleGroupCount,
      female_calf_count: femaleCalfCount,
      single_female_count: singleFemaleCount,
      is_damage_caused: isDamageCaused,
      damage_type: damageType,
      chase_start_time: chaseStartTime || null,
      chase_result: chaseResult,
      remarks: remarks
    })
    .select()
    .single();
    
  if (error) throw new Error('Failed to save report: ' + error.message);
  return data;
}

/**
 * Fetches recent reports for the Notification History
 */
export async function getRecentReports(limit = 20) {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error('Failed to fetch recent reports: ' + error.message);
  return data;
}
