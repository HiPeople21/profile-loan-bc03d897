import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload, User } from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [profile, setProfile] = useState({
    full_name: "",
    avatar_url: "",
  });
  
  const [borrowerProfile, setBorrowerProfile] = useState({
    credit_score: "",
    bio: "",
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      // Fetch main profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .maybeSingle();

      if (profileError) throw profileError;

      setProfile({
        full_name: profileData?.full_name || "",
        avatar_url: profileData?.avatar_url || "",
      });

      // Fetch borrower profile if exists
      const { data: borrowerData } = await supabase
        .from("borrower_profiles")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (borrowerData) {
        setBorrowerProfile({
          credit_score: borrowerData.credit_score?.toString() || "",
          bio: borrowerData.bio || "",
        });
      }
    } catch (error: any) {
      toast.error("Failed to load profile");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL with cache-busting timestamp
      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrlWithTimestamp = `${data.publicUrl}?t=${Date.now()}`;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrlWithTimestamp })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: avatarUrlWithTimestamp });
      
      // Force refetch on dashboard by updating the timestamp
      await fetchProfile();
      
      toast.success("Profile picture updated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      // Update main profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update or insert borrower profile if credit score or bio provided
      if (borrowerProfile.credit_score || borrowerProfile.bio) {
        const { error: borrowerError } = await supabase
          .from("borrower_profiles")
          .upsert({
            user_id: user.id,
            credit_score: borrowerProfile.credit_score ? parseInt(borrowerProfile.credit_score) : null,
            bio: borrowerProfile.bio,
          }, { onConflict: 'user_id' });

        if (borrowerError) throw borrowerError;
      }

      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <h1 className="text-4xl font-bold mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Profile Picture */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Upload your profile picture</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback>
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <div>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("avatar-upload")?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Image
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Max 2MB. JPG, PNG, or GIF
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Legal Name</Label>
                <Input
                  id="full_name"
                  placeholder="John Doe"
                  value={profile.full_name}
                  onChange={(e) =>
                    setProfile({ ...profile, full_name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (read-only)</Label>
                <Input id="email" value={user?.email || ""} disabled />
              </div>
            </CardContent>
          </Card>

          {/* Credit Information */}
          <Card>
            <CardHeader>
              <CardTitle>Credit Information</CardTitle>
              <CardDescription>
                Optional: Add your credit information for better loan approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="credit_score">Credit Score</Label>
                <Input
                  id="credit_score"
                  type="number"
                  placeholder="750"
                  value={borrowerProfile.credit_score}
                  onChange={(e) =>
                    setBorrowerProfile({
                      ...borrowerProfile,
                      credit_score: e.target.value,
                    })
                  }
                  min="300"
                  max="850"
                />
                <p className="text-xs text-muted-foreground">
                  Range: 300-850
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio / About You</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell potential investors about yourself..."
                  value={borrowerProfile.bio}
                  onChange={(e) =>
                    setBorrowerProfile({ ...borrowerProfile, bio: e.target.value })
                  }
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSaveProfile}
            disabled={isSaving}
            variant="hero"
            size="lg"
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;