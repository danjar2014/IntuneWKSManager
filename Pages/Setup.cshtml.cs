using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace IntuneWksManager.Pages;

[Authorize(Policy = "PrimaryAdmin")]
public class SetupModel : PageModel
{
    public void OnGet()
    {
    }
}
